"use client"


import { useState, useEffect } from "react"
import Image from "next/image"
import { 
  Users,
  LayoutDashboard,
  Building,
  Building2,
  LogOut,
  FileText,
  MessageCircle,
  ChartSpline,
  ChartPie,
  Settings, 
  HelpCircle, 
  ChevronRight, 
  ChevronLeft,
  UserCog,
  FileSpreadsheet,
  Library,
  Target,
  CreditCard,
  LayoutList,
  type LucideIcon, 
  House,
  Palette,
  Wallet,
  Megaphone,
  LinkIcon,
  LayoutPanelLeft,
  UploadCloud
} from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useRouter, usePathname } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"

interface SidebarItemProps {
  icon: LucideIcon
  label: string
  active: boolean
  onClick: () => void
  badge?: number
  collapsed?: boolean
}

function SidebarItem({ icon: Icon, label, active, onClick, badge, collapsed }: SidebarItemProps) {
  const buttonContent = (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center rounded-xl transition-all duration-200 mb-1 group relative",
        collapsed ? "w-10 h-10 justify-center p-0 mx-auto" : "w-full justify-between px-4 py-3",
        active 
          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" 
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}>
        <Icon size={20} className={cn(
          badge !== undefined && badge > 0 && !active && "text-[#007AFF] animate-pulse"
        )} />
        {!collapsed && <span className="font-medium whitespace-nowrap">{label}</span>}
      </div>
      
      {!collapsed && badge !== undefined && badge > 0 && (
        <span className="bg-[#FF3B30] text-white text-[10px] px-1.5 py-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full font-bold shadow-sm animate-in zoom-in duration-300">
          {badge > 99 ? '99+' : badge}
        </span>
      )}

      {collapsed && badge !== undefined && badge > 0 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#FF3B30] text-white text-[8px] flex items-center justify-center rounded-full border-2 border-card font-bold animate-pulse" />
      )}

      {!collapsed && badge === undefined && (
        <ChevronRight size={16} className={`opacity-0 transition-opacity ${active ? "opacity-100" : "group-hover:opacity-50"}`} />
      )}
    </button>
  )

  if (collapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            {buttonContent}
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {label} {badge ? `(${badge})` : ''}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return buttonContent
}

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  activeTab: string
  onTabChange: (tab: string) => void
  atendimentosCount?: number
}

export function Sidebar({ isOpen, onClose, activeTab, onTabChange, atendimentosCount }: SidebarProps) {
  const { toast } = useToast()
  const [isCollapsed, setIsCollapsed] = useState(true)
  const [userData, setUserData] = useState<{ name: string; email: string; initial: string; avatarUrl?: string; role?: string } | null>(null)
  const [unreadSupportCount, setUnreadSupportCount] = useState(0)
  const [allowedRoutes, setAllowedRoutes] = useState<string[]>([])
  const router = useRouter()
  const pathname = usePathname()

  // Lógica de permissão dinâmica
  const canAccessRoute = (route: string) => {
    if (route === '/') return allowedRoutes.includes('/')
    if (route === '/admin/bio' && allowedRoutes.includes('/admin/bio')) return true
    return allowedRoutes.some(r => {
      if (r === '/') return false
      return route.startsWith(r)
    })
  }

  // Variáveis auxiliares para facilitar o entendimento e manutenção das permissões
  const canAccessChat = canAccessRoute('/chat-support')
  const isHighLevelUser = userData?.role === 'Diretor' || userData?.role === 'Gestor' || userData?.role === 'Marketing' || userData?.role === 'Secretária' || userData?.role === 'Admin';
  const isManagerOrAbove = userData?.role === 'Diretor' || userData?.role === 'Gestor' || userData?.role === 'Marketing' || userData?.role === 'Admin';

  const hasAccessToMainMenu = canAccessRoute('/') || canAccessRoute('/services') || canAccessRoute('/kanban') || canAccessRoute('/homes') || canAccessRoute('/brokers') || canAccessRoute('/units')
  const hasAccessToMetrics = canAccessRoute('/campaigns') || canAccessRoute('/indicators') || canAccessRoute('/forms') || canAccessRoute('/spreadsheets') || canAccessRoute('/custom-dashboard')

  // Atualiza o título da aba com a contagem de mensagens não lidas
  useEffect(() => {
    const originalTitle = document.title;
    if (unreadSupportCount > 0) {
      document.title = `(${unreadSupportCount}) Novo Ticket - ${originalTitle.replace(/^\(\d+\)\s/, '')}`;
    } else {
      document.title = originalTitle.replace(/^\(\d+\)\s/, '');
    }
    return () => { document.title = originalTitle; }
  }, [unreadSupportCount])

  // Busca mensagens não lidas para o suporte e configura notificações globais
  useEffect(() => {
    const fetchUnreadCount = async () => {
      const { count } = await supabase
        .from('suporte_mensagens')
        .select('*', { count: 'exact', head: true })
        .eq('eh_admin', false)
        .eq('lida', false)
      
      setUnreadSupportCount(count || 0)
    }

    fetchUnreadCount()

    const subscription = supabase
      .channel('global_support_listener')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'suporte_mensagens' 
      }, (payload) => {
        const newMessage = payload.new;
        fetchUnreadCount()

        // Notifica o suporte globalmente se a mensagem for de um cliente
        if (!newMessage.eh_admin && canAccessChat && pathname !== '/chat-support') {
          let meta = newMessage.metadados;
          if (meta && typeof meta === 'string') {
            try { meta = JSON.parse(meta); } catch(e) {}
          }

          toast({
            title: `Mensagem de ${meta?.nome || 'Novo Cliente'}`,
            description: newMessage.conteudo.substring(0, 60) + (newMessage.conteudo.length > 60 ? "..." : ""),
            variant: "support",
            action: (
              <Button size="sm" className="rounded-full bg-[#007AFF] text-white hover:bg-[#0062CC] shadow-md border-none px-4 font-semibold transition-all active:scale-95" onClick={() => router.push(`/chat-support?id=${newMessage.chamado_id}`)}>
                Responder
              </Button>
            ),
          })

          try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3')
            audio.volume = 0.5
            audio.play().catch(() => {})
          } catch (e) {}
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'suporte_mensagens'
      }, () => {
        fetchUnreadCount()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [canAccessChat, pathname, router, toast])

  // Busca os dados atualizados do perfil (incluindo o avatar e a role)
  useEffect(() => {
    const getUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, avatar_url, role')
          .eq('id', user.id)
          .maybeSingle()

        const fullName = profileData?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || "Usuário"
        const initial = fullName.charAt(0).toUpperCase()
        
        setUserData({
          name: fullName,
          email: user.email || "",
          initial: initial,
          avatarUrl: profileData?.avatar_url,
          role: profileData?.role 
        })

        // Buscar permissões dinâmicas
        const { data: permissions } = await supabase
          .from('role_permissions')
          .select('route')
          .eq('role', profileData?.role || '')
        
        if (permissions) {
          setAllowedRoutes(permissions.map(p => p.route))
        }
      }
    }
    getUserData()
    
    const profileSubscription = supabase
      .channel('profile_changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, payload => {
        getUserData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(profileSubscription)
    }
  }, [])

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      router.push("/login")
      router.refresh()
    } catch (error) {
      console.error("Erro ao sair:", error)
    }
  }

  const handleNavigation = (key: string, route?: string) => {
    if (route) {
      if (pathname !== route) {
        router.push(route)
      }
    } else {
      if (pathname !== "/") {
        router.push("/")
      } else {
        onTabChange?.(key)
      }
    }
    
    if (window.innerWidth < 1024) {
      onClose()
    }
  }

  const isActive = (key: string, route?: string) => {
    if (route && pathname === route) return true
    // Se o usuário não tem role alta, a home dele será "/brokers/my-card", então a lógica de isActive na "/" para ele muda.
    if (pathname === "/" && activeTab === key) return true
    return false
  }

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside 
          className={cn(
            "fixed lg:static inset-y-0 left-0 z-50 bg-card border-r border-border transform transition-all duration-300 ease-in-out flex flex-col",
            isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
            isCollapsed ? "w-[80px]" : "w-72"
          )}
        >
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex absolute -right-3 top-9 w-6 h-6 bg-card border border-border rounded-full items-center justify-center text-muted-foreground hover:text-primary transition-colors shadow-sm z-50"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className="h-full flex flex-col overflow-hidden">
          <div 
            onClick={() => handleNavigation("dashboard")}
            className={cn("flex items-center transition-all duration-300 cursor-pointer group/logo", isCollapsed ? "p-4 justify-center" : "p-6 gap-4")}
          >
            <div className="relative flex-shrink-0 transition-transform group-hover/logo:scale-105 active:scale-95">
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-primary to-primary/60 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/25">
                <Image 
                  src="/icon.svg" 
                  alt="Logo Central63" 
                  width={30} 
                  height={30} 
                  className="priority"
                  priority
                />
              </div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 lg:w-4 lg:h-4 bg-emerald-500 rounded-full border-2 border-card" />
            </div>
            
            <div className={cn("transition-all duration-300 overflow-hidden whitespace-nowrap", 
              isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100 block"
            )}>
              <h1 className="font-bold text-xl text-foreground tracking-tight group-hover/logo:text-primary transition-colors">Central63</h1>
              <p className="text-xs text-muted-foreground">Gestão Imobiliária</p>
            </div>
          </div>

          <nav className="flex-1 py-6 space-y-1 overflow-y-auto overflow-x-hidden px-3">
            
            {/* Bloco: Menu Principal */}
            {hasAccessToMainMenu && (
              <>
                {!isCollapsed && (
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-4 whitespace-nowrap">
                    Menu Principal
                  </div>
                )}
                {canAccessRoute('/') && (
                  <SidebarItem 
                    icon={LayoutDashboard}
                    label="Home" 
                    active={isActive("dashboard") && pathname === "/"} 
                    onClick={() => handleNavigation("dashboard")}
                    badge={atendimentosCount}
                    collapsed={isCollapsed}
                  />
                )}
                
                {canAccessRoute('/services') && (
                  <SidebarItem 
                    icon={Users} 
                    label="Atendimentos" 
                    active={isActive("atendimentos", "/services")} 
                    onClick={() => handleNavigation("atendimentos", "/services")} 
                    collapsed={isCollapsed}
                  />
                )}
                
                {canAccessRoute('/kanban') && (
                  <SidebarItem 
                    icon={LayoutList} 
                    label="Kanban" 
                    active={isActive("kanban", "/kanban")} 
                    onClick={() => handleNavigation("kanban", "/kanban")} 
                    collapsed={isCollapsed}
                  />
                )}
                
                {canAccessRoute('/homes') && (
                  <SidebarItem 
                    icon={Building2} 
                    label="Imóveis" 
                    active={isActive("imoveis", "/homes")} 
                    onClick={() => handleNavigation("imoveis", "/homes")} 
                    collapsed={isCollapsed}
                  />
                )}
                
                {canAccessRoute('/brokers') && (
                  <SidebarItem 
                    icon={UserCog} 
                    label="Corretores" 
                    active={isActive("corretores", "/brokers")} 
                    onClick={() => handleNavigation("corretores", "/brokers")}
                    collapsed={isCollapsed}
                  />
                )}
                
                {canAccessRoute('/units') && (
                  <SidebarItem 
                    icon={House} 
                    label="Unidades" 
                    active={isActive("unidades", "/units")} 
                    onClick={() => handleNavigation("unidades", "/units")}
                    collapsed={isCollapsed}
                  />
                )}
              </>
            )}

            {/* Bloco: Ferramentas */}
            {!isCollapsed && (
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-8 mb-4 px-4 whitespace-nowrap">
                Ferramentas
              </div>
            )}
            {isCollapsed && <div className="my-4 border-t border-border mx-2" />}

            {canAccessRoute('/admin/benefit-cards') && (
              <SidebarItem 
                icon={Wallet} 
                label="Gestão de Cartões" 
                active={isActive("benefit-cards-admin", "/admin/benefit-cards")} 
                onClick={() => handleNavigation("benefit-cards-admin", "/admin/benefit-cards")}
                collapsed={isCollapsed}
              />
            )}  

            {/* Item liberado para todos (Geralmente) */}
            {canAccessRoute('/brokers/my-card') && (
              <SidebarItem 
                icon={CreditCard} 
                label="Meu Cartão" 
                active={isActive("my-benefit-card", "/brokers/my-card")} 
                onClick={() => handleNavigation("my-benefit-card", "/brokers/my-card")}
                collapsed={isCollapsed}
              />
            )}

            {canAccessRoute('/admin/bio') && (
              <SidebarItem 
              icon={LinkIcon} 
              label="Links na Bio" 
              active={isActive("bio-admin", "/admin/bio")} 
              onClick={() => handleNavigation("bio-admin", "/admin/bio")}
              collapsed={isCollapsed}
              />
            )}

            {canAccessRoute('/editor') && (
              <SidebarItem 
                icon={Palette} 
                label="Flow Design" 
                active={isActive("editor-arte", "/editor")} 
                onClick={() => handleNavigation("editor-arte", "/editor")}
                collapsed={isCollapsed}
              />
            )}

            {/* Bloco: Documentos & Métricas */}
            {!isCollapsed && hasAccessToMetrics && (
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-8 mb-4 px-4 whitespace-nowrap">
                Documentos & Métricas
              </div>
            )}

            {isCollapsed && <div className="my-4 border-t border-border mx-2" />}

            {canAccessRoute('/campaigns') && (
              <SidebarItem 
                icon={Megaphone} 
                label="Camapanhas" 
                active={isActive("camapanhas", "/campaigns")} 
                onClick={() => handleNavigation("camapanhas", "/campaigns")}
                collapsed={isCollapsed}
              />
            )}

            {canAccessRoute('/indicators') && (
              <SidebarItem 
                icon={ChartPie} 
                label="Indicadores" 
                active={isActive("indicadores", "/indicators")} 
                onClick={() => handleNavigation("indicadores", "/indicators")}
                collapsed={isCollapsed}
              />
            )}
            
            {canAccessRoute('/forms') && (
              <SidebarItem 
                icon={Library} 
                label="Formulários" 
                active={isActive("formularios", "/forms")} 
                onClick={() => handleNavigation("formularios", "/forms")}
                collapsed={isCollapsed}
              />
            )}

            {canAccessRoute('/forms/import-leads') && (
              <SidebarItem 
                icon={UploadCloud} 
                label="Importar Leads" 
                active={isActive("importar-leads", "/forms/import-leads")} 
                onClick={() => handleNavigation("importar-leads", "/forms/import-leads")}
                collapsed={isCollapsed}
              />
            )}

            {canAccessRoute('/spreadsheets') && (
              <SidebarItem 
                icon={FileSpreadsheet} 
                label="Planilhas" 
                active={isActive("planilhas", "/spreadsheets")} 
                onClick={() => handleNavigation("planilhas", "/spreadsheets")}
                collapsed={isCollapsed}
              />
            )}

            {canAccessRoute('/custom-dashboard') && (
              <SidebarItem 
                icon={ChartSpline} 
                label="Dashboard" 
                active={isActive("dashboard-customizavel", "/custom-dashboard")} 
                onClick={() => handleNavigation("dashboard-customizavel", "/custom-dashboard")}
                collapsed={isCollapsed}
              />
            )}

            {/* Bloco: Sistema */}
            {!isCollapsed && (
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-8 mb-4 px-4 whitespace-nowrap">
                Sistema
              </div>
            )}
            {isCollapsed && <div className="my-4 border-t border-border mx-2" />}

            {canAccessChat && pathname !== '/editor' && (
              <SidebarItem 
                icon={MessageCircle} 
                label="Chat de Suporte" 
                active={isActive("chat", "/chat-support")} 
                onClick={() => handleNavigation("chat", "/chat-support")}
                badge={unreadSupportCount > 0 ? unreadSupportCount : undefined}
                collapsed={isCollapsed}
              />
            )}

            {canAccessRoute('/settings') && (
              <SidebarItem 
                icon={Settings} 
                label="Configurações" 
                active={isActive("config", "/settings")} 
                onClick={() => handleNavigation("config", "/settings")}
                collapsed={isCollapsed}
              />
            )}

            {canAccessRoute('/support') && pathname !== '/editor' && (
              <SidebarItem 
                icon={HelpCircle} 
                label="Suporte" 
                active={isActive("support", "/support")} 
                onClick={() => handleNavigation("support", "/support")}
                collapsed={isCollapsed}
              />
            )}

          </nav>

          <div className="p-3 border-t border-border mt-auto">
            <div className={cn(
              "flex items-center rounded-xl bg-accent/50 mb-2 transition-all",
              isCollapsed ? "justify-center p-2 bg-transparent" : "gap-3 p-3"
            )}>
              <div className="relative flex-shrink-0">
                <Avatar className="w-9 h-9 lg:w-10 lg:h-10 border border-border">
                  <AvatarImage src={userData?.avatarUrl} alt={userData?.name} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-sm font-bold">
                    {userData?.initial || <Users size={18} />}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-card" />
              </div>
              
              {!isCollapsed && (
                <div className="flex-1 min-w-0 overflow-hidden">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {userData?.name || "Usuário"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {userData?.email || "Acessando..."}
                  </p>
                </div>
              )}
            </div>
            
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                  onClick={handleSignOut} 
                  className={cn(
                    "flex items-center text-muted-foreground hover:text-destructive text-sm transition-colors rounded-lg hover:bg-destructive/10",
                    isCollapsed ? "justify-center w-full py-3" : "gap-2 px-3 py-2 w-full"
                  )}>
                    <LogOut size={18} />
                    {!isCollapsed && <span>Sair do sistema</span>}
                  </button>
                </TooltipTrigger>
                {isCollapsed && <TooltipContent side="right">Sair do sistema</TooltipContent>}
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </aside>
    </>
  )
}