import { useState, useEffect, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────
type Screen = 'login' | 'dashboard' | 'internet' | 'dns-exec' | 'dns-tech'
type Scenario = 'normal' | 'degradation' | 'crisis' | 'partial'
type Panel = null | 'protocol' | 'ai'
type Status = 'ok' | 'warning' | 'critical' | 'partial' | 'incorporating' | 'nodata' | 'elevating'

// ─── Status config ────────────────────────────────────────────────────────────
const SC: Record<Status, { label: string; color: string; bg: string; border: string }> = {
  ok:            { label: 'OK',                  color: '#35A853', bg: '#EDF7F1', border: '#B8E5C6' },
  warning:       { label: 'Warning',             color: '#F5A623', bg: '#FFF8ED', border: '#FAD9A0' },
  critical:      { label: 'NOK',                 color: '#D64541', bg: '#FDF2F1', border: '#F0B8B6' },
  partial:       { label: 'Información parcial', color: '#F5A623', bg: '#FFF8ED', border: '#FAD9A0' },
  incorporating: { label: 'En incorporación',    color: '#7A8793', bg: '#F4F7FB', border: '#C5CDD5' },
  nodata:        { label: 'Sin datos',           color: '#7A8793', bg: '#F4F7FB', border: '#C5CDD5' },
  elevating:     { label: 'En levantamiento',    color: '#00A6C8', bg: '#F0FAFD', border: '#A0DFF0' },
}

// ─── Server data by scenario ──────────────────────────────────────────────────
function getServers(scenario: Scenario) {
  const base = [
    { name: 'Infoblox 1', location: 'Santiago, Moneda',  zone: 'Zona Centro-Norte' },
    { name: 'Infoblox 2', location: 'Santiago, Holanda', zone: 'Zona Centro-Norte' },
    { name: 'Infoblox 3', location: 'Puerto Montt',      zone: 'Zona Sur' },
    { name: 'Infoblox 4', location: 'Valdivia',          zone: 'Zona Sur' },
  ]
  const byScenario: Record<Scenario, { status: Status; ms: number; avail: string; trend: 'up' | 'down' | 'stable'; data: number[] }[]> = {
    normal:      [
      { status: 'ok',       ms: 14, avail: '99.98%', trend: 'stable', data: [13,14,14,13,15,14,14,13,14,14] },
      { status: 'ok',       ms: 12, avail: '99.99%', trend: 'stable', data: [12,11,12,13,12,12,11,12,12,13] },
      { status: 'ok',       ms: 16, avail: '99.96%', trend: 'stable', data: [15,16,16,15,17,16,15,16,16,15] },
      { status: 'ok',       ms: 18, avail: '99.95%', trend: 'stable', data: [17,18,18,19,18,17,18,18,17,18] },
    ],
    degradation: [
      { status: 'ok',       ms: 14,  avail: '99.98%', trend: 'stable', data: [13,14,14,13,15,14,14,13,14,14] },
      { status: 'ok',       ms: 12,  avail: '99.99%', trend: 'stable', data: [12,11,12,13,12,12,11,12,12,13] },
      { status: 'warning',  ms: 138, avail: '98.2%',  trend: 'up',     data: [16,18,20,35,55,82,110,125,135,138] },
      { status: 'warning',  ms: 156, avail: '97.8%',  trend: 'up',     data: [18,19,22,38,65,95,125,142,150,156] },
    ],
    crisis:      [
      { status: 'ok',       ms: 14, avail: '99.97%', trend: 'stable', data: [13,14,14,13,15,14,14,13,14,14] },
      { status: 'ok',       ms: 12, avail: '99.99%', trend: 'stable', data: [12,11,12,13,12,12,11,12,12,13] },
      { status: 'critical', ms: 0,  avail: '0.0%',   trend: 'up',     data: [16,22,45,88,160,220,350,500,600,0] },
      { status: 'critical', ms: 0,  avail: '0.0%',   trend: 'up',     data: [18,25,50,100,180,260,400,560,700,0] },
    ],
    partial:     [
      { status: 'warning',  ms: 22, avail: '98.8%', trend: 'stable', data: [14,15,18,22,24,22,21,20,21,22] },
      { status: 'ok',       ms: 12, avail: '99.99%', trend: 'stable', data: [12,11,12,13,12,12,11,12,12,13] },
      { status: 'nodata',   ms: 0,  avail: '–',     trend: 'stable', data: [] },
      { status: 'nodata',   ms: 0,  avail: '–',     trend: 'stable', data: [] },
    ],
  }
  return base.map((b, i) => ({ ...b, ...byScenario[scenario][i] }))
}

// ─── Scenario data ────────────────────────────────────────────────────────────
type DimData = { status: Status; desc: string; detail: string }

type ScenarioData = {
  label: string
  overallStatus: Status
  overallText: string
  domains: Record<string, { status: Status; text: string; note?: string }>
  situacion: {
    servicio: string; componente: string; situacion: string; alcance: string
    impacto: string; accion: string; responsable: string; proxima: string
  } | null
  internet: { dns: Status; dhcp: Status; transito: Status }
  dns: {
    globalStatus: Status; globalDesc: string
    infraestructura: DimData
    calidad: DimData
    capacidad: DimData
    zonaCN: { status: Status; desc: string; locations: string }
    zonaSur: { status: Status; desc: string; locations: string }
    queOcurre: string; impacto: string; accion: string; responsable: string; proxima: string
  }
}

const SCENARIOS: Record<Scenario, ScenarioData> = {
  partial: {
    label: 'Cobertura parcial actual',
    overallStatus: 'critical',
    overallText: 'Afectación detectada en DNS. DHCP y Tránsito en incorporación.',
    domains: {
      internet:    { status: 'warning',       text: 'Monitoreo disponible parcialmente', note: 'DNS activo. DHCP y Tránsito en incorporación.' },
      conectividad:{ status: 'elevating',     text: 'Indicadores en definición' },
      serviciosTI: { status: 'elevating',     text: 'Coordinación con equipos responsables' },
      dataCenter:  { status: 'elevating',     text: 'Definición de indicadores en curso' },
      telefonia:   { status: 'incorporating', text: 'Información pendiente' },
      internos:    { status: 'elevating',     text: 'Netcracker y Microsoft AX en evaluación' },
    },
    situacion: {
      servicio: 'Internet', componente: 'DNS',
      situacion: 'Afectación en infraestructura y calidad del servicio DNS en Zona Sur',
      alcance: 'Zona Sur (Puerto Montt y Valdivia)',
      impacto: 'Clientes de Zona Sur podrían presentar dificultades de navegación',
      accion: 'Equipo de Operación Internet validando componentes en Zona Sur',
      responsable: 'Operación Internet', proxima: '15 minutos',
    },
    internet: { dns: 'critical', dhcp: 'incorporating', transito: 'incorporating' },
    dns: {
      globalStatus: 'warning',
      globalDesc: 'El servicio se mantiene disponible, con información parcial en Zona Sur.',
      infraestructura: {
        status: 'warning',
        desc: 'Los componentes de Zona Centro-Norte se encuentran operativos. Zona Sur con información limitada.',
        detail: 'Solo Zona Centro-Norte reporta datos disponibles.',
      },
      calidad: {
        status: 'warning',
        desc: 'Se detecta un aumento en los tiempos de respuesta en Zona Sur.',
        detail: 'Algunos clientes podrían percibir una mayor demora durante la navegación.',
      },
      capacidad: {
        status: 'ok',
        desc: 'La capacidad actual permite mantener la operación.',
        detail: 'Sin riesgo inmediato de saturación.',
      },
      zonaCN: { status: 'ok',      desc: 'Operación normal',    locations: 'Santiago, Moneda y Holanda' },
      zonaSur:{ status: 'warning', desc: 'Respuesta degradada', locations: 'Puerto Montt y Valdivia' },
      queOcurre:   'Se observa una degradación parcial en el tiempo de respuesta del servicio DNS en Zona Sur.',
      impacto:     'Algunos clientes podrían experimentar mayor demora durante la navegación.',
      accion:      'El equipo de Operación Internet se encuentra validando los componentes involucrados.',
      responsable: 'Operación Internet',
      proxima:     '15 minutos',
    },
  },
  normal: {
    label: 'Operación normal',
    overallStatus: 'ok',
    overallText: 'Todos los servicios operando con normalidad',
    domains: {
      internet:    { status: 'ok', text: 'Operación normal' },
      conectividad:{ status: 'ok', text: 'Operación normal' },
      serviciosTI: { status: 'ok', text: 'Operación normal' },
      dataCenter:  { status: 'ok', text: 'Operación normal' },
      telefonia:   { status: 'ok', text: 'Operación normal' },
      internos:    { status: 'ok', text: 'Operación normal' },
    },
    situacion: null,
    internet: { dns: 'ok', dhcp: 'ok', transito: 'ok' },
    dns: {
      globalStatus: 'ok',
      globalDesc: 'El servicio DNS opera con normalidad en todos los territorios.',
      infraestructura: {
        status: 'ok',
        desc: 'Todos los componentes necesarios para prestar el servicio se encuentran operativos.',
        detail: 'Zona Centro-Norte y Zona Sur en operación normal.',
      },
      calidad: {
        status: 'ok',
        desc: 'El servicio funciona correctamente y con tiempos de respuesta adecuados.',
        detail: 'Sin impacto en la experiencia de los clientes.',
      },
      capacidad: {
        status: 'ok',
        desc: 'Los recursos disponibles son suficientes para mantener la operación actual.',
        detail: 'Sin riesgo de saturación.',
      },
      zonaCN: { status: 'ok', desc: 'Operación normal', locations: 'Santiago, Moneda y Holanda' },
      zonaSur:{ status: 'ok', desc: 'Operación normal', locations: 'Puerto Montt y Valdivia' },
      queOcurre:   'Todos los componentes del servicio DNS operan dentro de los parámetros normales.',
      impacto:     'Sin impacto en clientes.',
      accion:      'Sin acciones correctivas requeridas. Monitoreo continuo activo.',
      responsable: 'Operación Internet',
      proxima:     '30 minutos',
    },
  },
  degradation: {
    label: 'Degradación',
    overallStatus: 'warning',
    overallText: 'Internet con degradación parcial en Zona Sur',
    domains: {
      internet:    { status: 'warning', text: 'Degradación parcial en DNS', note: 'Calidad del DNS afectada en Zona Sur.' },
      conectividad:{ status: 'ok',      text: 'Operación normal' },
      serviciosTI: { status: 'ok',      text: 'Operación normal' },
      dataCenter:  { status: 'ok',      text: 'Operación normal' },
      telefonia:   { status: 'ok',      text: 'Operación normal' },
      internos:    { status: 'ok',      text: 'Operación normal' },
    },
    situacion: {
      servicio: 'Internet', componente: 'DNS',
      situacion: 'Degradación en calidad del servicio DNS en Zona Sur',
      alcance: 'Zona Sur',
      impacto: 'Clientes pueden experimentar mayor demora durante la navegación',
      accion: 'Equipo de Operación Internet validando componentes en Zona Sur',
      responsable: 'Operación Internet', proxima: '15 minutos',
    },
    internet: { dns: 'warning', dhcp: 'ok', transito: 'ok' },
    dns: {
      globalStatus: 'warning',
      globalDesc: 'El servicio se mantiene disponible, con una degradación parcial en Zona Sur.',
      infraestructura: {
        status: 'ok',
        desc: 'Los componentes necesarios para prestar el servicio se encuentran operativos.',
        detail: 'Zona Centro-Norte y Zona Sur operativos.',
      },
      calidad: {
        status: 'warning',
        desc: 'Se detecta una degradación en los tiempos de respuesta en Zona Sur.',
        detail: 'Clientes de Zona Sur podrían percibir mayor demora durante la navegación.',
      },
      capacidad: {
        status: 'ok',
        desc: 'Los recursos disponibles son suficientes para mantener la operación actual.',
        detail: 'Sin riesgo inmediato de saturación.',
      },
      zonaCN: { status: 'ok',      desc: 'Operación normal',    locations: 'Santiago, Moneda y Holanda' },
      zonaSur:{ status: 'warning', desc: 'Respuesta degradada', locations: 'Puerto Montt y Valdivia' },
      queOcurre:   'Se observa una degradación parcial en el tiempo de respuesta del servicio DNS en Zona Sur. Los equipos de Infoblox en Puerto Montt y Valdivia presentan tiempos superiores a los umbrales normales.',
      impacto:     'Algunos clientes de Zona Sur podrían experimentar mayor demora durante la navegación.',
      accion:      'El equipo de Operación Internet se encuentra validando los componentes involucrados en Puerto Montt y Valdivia.',
      responsable: 'Operación Internet',
      proxima:     '15 minutos',
    },
  },
  crisis: {
    label: 'Crisis',
    overallStatus: 'critical',
    overallText: 'Afectación crítica en Internet — Protocolo de crisis activo',
    domains: {
      internet:    { status: 'critical', text: 'Afectación crítica — Protocolo activo', note: 'DNS no disponible en Zona Sur.' },
      conectividad:{ status: 'warning',  text: 'Monitoreo activo por posible afectación' },
      serviciosTI: { status: 'ok',       text: 'Operación normal' },
      dataCenter:  { status: 'ok',       text: 'Operación normal' },
      telefonia:   { status: 'ok',       text: 'Operación normal' },
      internos:    { status: 'ok',       text: 'Operación normal' },
    },
    situacion: {
      servicio: 'Internet', componente: 'DNS',
      situacion: 'Servicio DNS no disponible en Zona Sur — Protocolo de crisis activado',
      alcance: 'Zona Sur (Puerto Montt y Valdivia)',
      impacto: 'Clientes sin acceso a servicios de navegación en Zona Sur',
      accion: 'Protocolo de crisis activado — Equipo de respuesta desplegado en sitio',
      responsable: 'Operación Internet + Centro de Respuesta a Incidentes', proxima: '5 minutos',
    },
    internet: { dns: 'critical', dhcp: 'warning', transito: 'warning' },
    dns: {
      globalStatus: 'critical',
      globalDesc: 'El servicio DNS no está disponible en Zona Sur. Protocolo de crisis activo.',
      infraestructura: {
        status: 'critical',
        desc: 'El servicio presenta una afectación de componentes en Zona Sur.',
        detail: 'Solo Zona Centro-Norte mantiene operación normal.',
      },
      calidad: {
        status: 'critical',
        desc: 'El servicio presenta degradación en Zona Sur y tiempos de respuesta elevados en Zona Centro-Norte.',
        detail: 'Clientes de Zona Sur podrían presentar dificultades de navegación.',
      },
      capacidad: {
        status: 'warning',
        desc: 'La Zona Centro-Norte está absorbiendo tráfico redistribuido.',
        detail: 'Existe riesgo de saturación si la situación se mantiene.',
      },
      zonaCN: { status: 'warning',  desc: 'Latencia elevada por tráfico redistribuido', locations: 'Santiago, Moneda y Holanda' },
      zonaSur:{ status: 'critical', desc: 'Sin servicio',                               locations: 'Puerto Montt y Valdivia' },
      queOcurre:   'El servicio DNS no está disponible en Zona Sur (componentes en Puerto Montt y Valdivia). Se ha activado el protocolo de crisis. El tráfico está siendo redistribuido a Zona Centro-Norte.',
      impacto:     'Clientes de Puerto Montt y Valdivia sin acceso a servicios de navegación. Posible afectación a otros servicios dependientes de DNS.',
      accion:      'Protocolo de crisis activo. Equipo de respuesta desplegado en sitio. Se están evaluando mecanismos de contingencia.',
      responsable: 'Operación Internet + Centro de Respuesta a Incidentes',
      proxima:     '5 minutos',
    },
  },
}

// ─── Utility ──────────────────────────────────────────────────────────────────
function useNow() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(id)
  }, [])
  return now
}
function fmtTime(d: Date) { return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) }
function fmtDate(d: Date) { return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) }

// ─── Status components ────────────────────────────────────────────────────────
function StatusDot({ status, size = 7 }: { status: Status; size?: number }) {
  const cfg = SC[status]
  const ping = status === 'critical' || status === 'warning'
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
      {ping && <span className="status-ping" style={{ position: 'absolute', borderRadius: '50%', width: size, height: size, backgroundColor: cfg.color, opacity: 0.5 }} />}
      <span style={{ position: 'relative', width: size, height: size, borderRadius: '50%', backgroundColor: cfg.color, display: 'inline-block' }} />
    </span>
  )
}

function StatusBadge({ status, size = 'md' }: { status: Status; size?: 'sm' | 'md' | 'lg' }) {
  const cfg = SC[status]
  const ps = { sm: '5px 10px', md: '6px 12px', lg: '8px 18px' }
  const fs = { sm: 11, md: 12, lg: 14 }
  const dotSz = { sm: 6, md: 7, lg: 8 }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: ps[size],
      borderRadius: 20, fontWeight: 700, fontSize: fs[size], letterSpacing: '0.01em',
      color: cfg.color, backgroundColor: cfg.bg, border: `1.5px solid ${cfg.border}`,
    }}>
      <StatusDot status={status} size={dotSz[size]} />
      {cfg.label}
    </span>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────
function Icon({ name, size = 16, color = 'currentColor' }: { name: string; size?: number; color?: string }) {
  const s = { width: size, height: size, color, flexShrink: 0 }
  const M: Record<string, React.ReactElement> = {
    home:        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} style={s}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>,
    internet:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} style={s}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/></svg>,
    network:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} style={s}><rect x="2" y="2" width="6" height="6" rx="1"/><rect x="16" y="2" width="6" height="6" rx="1"/><rect x="9" y="16" width="6" height="6" rx="1"/><path d="M5 8v4M19 8v4M5 12h14M12 12v4"/></svg>,
    server:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} style={s}><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>,
    datacenter:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} style={s}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>,
    phone:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} style={s}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8 19.79 19.79 0 01.06 1.18 2 2 0 012 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14v2.92z"/></svg>,
    settings:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} style={s}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
    refresh:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={s}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>,
    arrowLeft:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={s}><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
    arrowRight:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={s}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
    externalLink:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={s}><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
    alert:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={s}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
    user:        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={s}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    clock:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={s}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    mapPin:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={s}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
    chevronRight:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={s}><polyline points="9 18 15 12 9 6"/></svg>,
    shield:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={s}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    brain:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} style={s}><path d="M12 5C8.5 5 6 7.5 6 10c0 1.8 1 3.4 2.5 4.2C8.2 15.3 8 16.6 8 18h8c0-1.4-.2-2.7-.5-3.8C17 13.4 18 11.8 18 10c0-2.5-2.5-5-6-5z"/><path d="M6 10c-1.7 0-3 1.3-3 3s1.3 3 3 3M18 10c1.7 0 3 1.3 3 3s-1.3 3-3 3M12 5V3"/></svg>,
    check:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} style={s}><polyline points="20 6 9 17 4 12"/></svg>,
    x:           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={s}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    filter:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={s}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
    star:        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={s}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    eye:         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={s}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
    eyeOff:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={s}><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
    lock:        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={s}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
    mail:        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={s}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  }
  return M[name] ?? <span style={{ width: size, height: size, display: 'inline-block' }} />
}

// ─── Button ───────────────────────────────────────────────────────────────────
function Btn({ children, variant = 'primary', onClick, small }: {
  children: React.ReactNode; variant?: 'primary' | 'secondary' | 'ghost' | 'outline'
  onClick?: () => void; small?: boolean
}) {
  const S: Record<string, React.CSSProperties> = {
    primary:  { background: '#00A6C8', color: '#fff', border: '1px solid #00A6C8' },
    secondary:{ background: '#0B1F3A', color: '#fff', border: '1px solid #0B1F3A' },
    ghost:    { background: 'transparent', color: '#0B1F3A', border: '1px solid #C5CDD5' },
    outline:  { background: 'transparent', color: '#00A6C8', border: '1px solid #00A6C8' },
  }
  return (
    <button onClick={onClick} className="btn" style={{
      ...S[variant], padding: small ? '6px 14px' : '9px 20px', borderRadius: 8,
      fontWeight: 600, fontSize: small ? 12 : 13, cursor: 'pointer',
      display: 'inline-flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap',
      fontFamily: 'inherit', letterSpacing: '0.01em',
    }}>
      {children}
    </button>
  )
}

// ─── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ data, color, height = 36, width = 90 }: { data: number[]; color: string; height?: number; width?: number }) {
  if (!data.length) return <span style={{ color: '#7A8793', fontSize: 11 }}>Sin datos</span>
  const max = Math.max(...data, 1), min = Math.min(...data), range = max - min || 1
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * (height - 4) - 2}`).join(' ')
  return <svg width={width} height={height} style={{ display: 'block' }}><polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" /></svg>
}

// ─── SCREEN 1: Login ──────────────────────────────────────────────────────────
function LoginScreen({ onLogin, scenario, onScenarioChange }: {
  onLogin: () => void; scenario: Scenario; onScenarioChange: (s: Scenario) => void
}) {
  const now = useNow()
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => { setLoading(false); onLogin() }, 900)
  }

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* LEFT PANEL — abstract geometric composition */}
      <div style={{
        width: '65%', position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(145deg, #0B1F3A 0%, #0D2A4A 60%, #112E52 100%)',
        flexShrink: 0,
      }}>
        {/* Abstract SVG composition */}
        <svg viewBox="0 0 940 900" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          <circle cx="820" cy="120" r="380" fill="#00A6C8" opacity="0.12" />
          <circle cx="820" cy="120" r="240" fill="#00A6C8" opacity="0.15" />
          <circle cx="820" cy="120" r="120" fill="#00A6C8" opacity="0.25" />
          <path d="M 600 0 Q 940 300 940 700" stroke="#00A6C8" strokeWidth="2" fill="none" opacity="0.25" />
          <path d="M 700 0 Q 940 280 940 900" stroke="#00A6C8" strokeWidth="1" fill="none" opacity="0.15" />
          <circle cx="80" cy="820" r="280" fill="#17365D" opacity="0.5" />
          <circle cx="80" cy="820" r="160" fill="#1A3D6A" opacity="0.6" />
          <ellipse cx="360" cy="800" rx="180" ry="60" fill="#F5A623" opacity="0.12" transform="rotate(-20 360 800)" />
          <ellipse cx="360" cy="800" rx="100" ry="34" fill="#F5A623" opacity="0.18" transform="rotate(-20 360 800)" />
          <circle cx="180" cy="280" r="90" fill="#35A853" opacity="0.10" />
          <circle cx="180" cy="280" r="48" fill="#35A853" opacity="0.14" />
          <circle cx="460" cy="420" r="6" fill="#00A6C8" opacity="0.6" />
          <circle cx="500" cy="360" r="4" fill="#35A853" opacity="0.5" />
          <circle cx="540" cy="460" r="3" fill="#F5A623" opacity="0.6" />
          <circle cx="400" cy="500" r="5" fill="#00A6C8" opacity="0.4" />
          <circle cx="350" cy="350" r="8" fill="#00A6C8" opacity="0.2" />
          <line x1="0" y1="600" x2="400" y2="200" stroke="#00A6C8" strokeWidth="1" opacity="0.1" />
          <line x1="0" y1="700" x2="300" y2="300" stroke="#35A853" strokeWidth="0.8" opacity="0.08" />
          <circle cx="820" cy="120" r="300" stroke="#00A6C8" strokeWidth="1" fill="none" opacity="0.1" />
          <circle cx="820" cy="120" r="420" stroke="#00A6C8" strokeWidth="1" fill="none" opacity="0.07" />
          <circle cx="820" cy="120" r="540" stroke="#00A6C8" strokeWidth="0.8" fill="none" opacity="0.05" />
        </svg>

        {/* Content overlay */}
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%', padding: '40px 56px' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#00A6C8', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(0,166,200,0.35)' }}>
              <Icon name="shield" size={20} color="#fff" />
            </div>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>Proyecto AIP</span>
          </div>

          {/* Center content */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ maxWidth: 440 }}>
              <h1 style={{ fontSize: 38, fontWeight: 800, color: '#fff', lineHeight: 1.18, letterSpacing: '-0.02em', margin: '0 0 16px' }}>
                Panel de Control<br />
                <span style={{ color: '#00A6C8' }}>de Crisis</span>
              </h1>
              <p style={{ fontSize: 16, color: '#8BADC8', lineHeight: 1.6, margin: '0 0 36px', maxWidth: 380 }}>
                Visibilidad unificada para una toma de decisiones rápida durante situaciones de contingencia operacional.
              </p>
              <div style={{ display: 'flex', gap: 20 }}>
                {[
                  { n: '6', l: 'Dominios monitoreados' },
                  { n: '<10s', l: 'Para identificar afectación' },
                  { n: '24/7', l: 'Monitoreo continuo' },
                ].map(({ n, l }) => (
                  <div key={l}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#00A6C8' }}>{n}</div>
                    <div style={{ fontSize: 11, color: '#6A8099', lineHeight: 1.4, maxWidth: 80 }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom */}
          <div style={{ fontSize: 11, color: '#3A5575' }}>
            {fmtDate(now)} · Plataforma corporativa interna
          </div>
        </div>
      </div>

      {/* RIGHT PANEL — login form */}
      <div style={{
        width: '35%', background: '#fff', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: '48px 48px',
        position: 'relative',
      }}>
        
        {/* SE ELIMINÓ EL BLOQUE "Escenario prototipo" DE AQUÍ */}

        <div style={{ width: '100%', maxWidth: 340 }}>
          {/* Form header */}
          <div style={{ marginBottom: 40 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#F0FAFD', border: '1.5px solid #A0DFF0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
              <Icon name="shield" size={22} color="#00A6C8" />
            </div>
            {/* Aquí cambiamos el texto a "Panel de Control" */}
            <h2 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 800, color: '#0B1F3A', letterSpacing: '-0.01em' }}>Panel de Control</h2>
            <p style={{ margin: 0, fontSize: 13, color: '#7A8793' }}>Inicia sesión para continuar</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#0B1F3A', marginBottom: 6 }}>Correo empresarial</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}>
                  <Icon name="mail" size={15} color="#7A8793" />
                </div>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="nombre@empresa.cl"
                  style={{
                    width: '100%', padding: '11px 14px 11px 40px', borderRadius: 9,
                    border: '1.5px solid #E4EBF2', fontSize: 13, color: '#0B1F3A',
                    fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                    background: '#F9FAFC', transition: 'border-color 0.15s',
                  }}
                  onFocus={e => (e.target.style.borderColor = '#00A6C8')}
                  onBlur={e => (e.target.style.borderColor = '#E4EBF2')}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#0B1F3A', marginBottom: 6 }}>Contraseña</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}>
                  <Icon name="lock" size={15} color="#7A8793" />
                </div>
                <input
                  type={showPass ? 'text' : 'password'} value={pass} onChange={e => setPass(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: '100%', padding: '11px 42px 11px 40px', borderRadius: 9,
                    border: '1.5px solid #E4EBF2', fontSize: 13, color: '#0B1F3A',
                    fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                    background: '#F9FAFC', transition: 'border-color 0.15s',
                  }}
                  onFocus={e => (e.target.style.borderColor = '#00A6C8')}
                  onBlur={e => (e.target.style.borderColor = '#E4EBF2')}
                />
                <button
                  type="button" onClick={() => setShowPass(p => !p)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#7A8793', padding: 4 }}
                >
                  <Icon name={showPass ? 'eyeOff' : 'eye'} size={16} />
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit" className="btn"
              style={{
                background: loading ? '#5EC8DC' : '#00A6C8', color: '#fff', border: 'none',
                padding: '12px 24px', borderRadius: 9, fontSize: 14, fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                marginTop: 4,
              }}
            >
              {loading ? (
                <>
                  <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                  Iniciando sesión…
                </>
              ) : (
                <>Iniciar sesión <Icon name="arrowRight" size={14} color="#fff" /></>
              )}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 11, color: '#B0BBC5', marginTop: 28, lineHeight: 1.5 }}>
            Plataforma interna corporativa · Acceso restringido<br />
            Solo usuarios autorizados
          </p>
        </div>

      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
// ─── Sidebar ──────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { key: 'dashboard',    label: 'Panel general',      icon: 'home',       screen: 'dashboard'  as Screen },
  { key: 'internet',     label: 'Internet',           icon: 'internet',   screen: 'internet'   as Screen },
  { key: 'conectividad', label: 'Conectividad',       icon: 'network',    screen: null },
  { key: 'serviciosTI',  label: 'Servicios TI',       icon: 'server',     screen: null },
  { key: 'dataCenter',   label: 'Data Center',        icon: 'datacenter', screen: null },
  { key: 'telefonia',    label: 'Telefonía y TV',     icon: 'phone',      screen: null },
  { key: 'internos',     label: 'Serv. internos',     icon: 'settings',   screen: null },
]

function Sidebar({ current, scenario, onNavigate }: { current: Screen; scenario: Scenario; onNavigate: (s: Screen) => void }) {
  const sd = SCENARIOS[scenario]
  const domainStatus: Record<string, Status> = {
    internet: sd.domains.internet.status, conectividad: sd.domains.conectividad.status,
    serviciosTI: sd.domains.serviciosTI.status, dataCenter: sd.domains.dataCenter.status,
    telefonia: sd.domains.telefonia.status, internos: sd.domains.internos.status,
  }
  const active = ['internet','dns-exec','dns-tech'].includes(current) ? 'internet' : current

  return (
    <aside style={{ width: 220, minHeight: '100vh', background: '#0B1F3A', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#00A6C8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="shield" size={16} color="#fff" />
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>Proyecto AIP</div>
            <div style={{ color: '#7A9BB5', fontSize: 10, fontWeight: 500 }}>Panel de Crisis</div>
          </div>
        </div>
      </div>
      <nav style={{ flex: 1, padding: '10px 8px' }}>
        <div style={{ fontSize: 10, color: '#3A5070', fontWeight: 700, padding: '8px 12px 6px', textTransform: 'uppercase', letterSpacing: '0.09em' }}>Dominios</div>
        {NAV_ITEMS.map(item => {
          const st = item.key !== 'dashboard' ? domainStatus[item.key] : undefined
          const isActive = active === item.key
          return (
            <button key={item.key} className={`sidebar-item ${isActive ? 'active' : ''}`}
              onClick={() => item.screen && onNavigate(item.screen)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                borderRadius: 8, border: 'none', cursor: item.screen ? 'pointer' : 'default',
                color: isActive ? '#00A6C8' : '#9BAEC0', marginBottom: 2, textAlign: 'left',
                background: isActive ? 'rgba(0,166,200,0.12)' : 'transparent',
                opacity: item.screen ? 1 : 0.55, fontFamily: 'inherit',
              }}>
              <Icon name={item.icon} size={15} />
              <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{item.label}</span>
              {st && <StatusDot status={st} size={6} />}
            </button>
          )
        })}
      </nav>
      <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="live-pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: '#35A853', display: 'inline-block' }} />
          <span style={{ fontSize: 10, color: '#3A5070', fontWeight: 500 }}>Conexión activa</span>
        </div>
      </div>
    </aside>
  )
}

// ─── App Header (3-zone) ──────────────────────────────────────────────────────
function AppHeader({
  title, breadcrumb, description, scenario, onRefresh, onPanel, showAI,
}: {
  title: string; breadcrumb?: string[]; description?: string
  scenario: Scenario; onRefresh: () => void; onPanel: (p: Panel) => void; showAI?: boolean
}) {
  const sd = SCENARIOS[scenario]
  const now = useNow()
  const [refreshing, setRefreshing] = useState(false)
  function handleRefresh() { setRefreshing(true); setTimeout(() => setRefreshing(false), 1200); onRefresh() }

  return (
    <header style={{
      background: '#fff', borderBottom: '1px solid #E4EBF2', padding: '0 28px',
      display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center',
      height: 72, gap: 24, flexShrink: 0,
    }}>
      {/* LEFT — breadcrumb + title */}
      <div style={{ minWidth: 0 }}>
        {breadcrumb && breadcrumb.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            {breadcrumb.map((b, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {i > 0 && <span style={{ color: '#C5CDD5', fontSize: 11 }}>/</span>}
                <span style={{ fontSize: 11, color: '#7A8793', fontWeight: 500 }}>{b}</span>
              </span>
            ))}
          </div>
        )}
        <h1 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0B1F3A', letterSpacing: '-0.01em', lineHeight: 1.2 }}>{title}</h1>
        {description && <p style={{ margin: '3px 0 0', fontSize: 12, color: '#7A8793', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{description}</p>}
      </div>

      {/* CENTER — status badge */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <StatusBadge status={sd.overallStatus} size="lg" />
        <span style={{ fontSize: 10, color: '#B0BBC5', fontWeight: 500, whiteSpace: 'nowrap' }}>Estado general</span>
      </div>

      {/* RIGHT — time, AI, refresh */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'flex-end' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#7A8793', fontSize: 12 }}>
          <Icon name="clock" size={13} />
          <span style={{ whiteSpace: 'nowrap' }}>{fmtDate(now)}, {fmtTime(now)}</span>
        </div>
        {showAI && (
          <button className="btn" onClick={() => onPanel('ai')} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px',
            borderRadius: 8, border: '1px solid #E4EBF2', background: '#F0FAFD',
            color: '#00A6C8', fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <Icon name="brain" size={14} color="#00A6C8" />
            Asistente AIP
            <span style={{ background: '#E8F7FB', color: '#00A6C8', fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 10, letterSpacing: '0.05em' }}>FUTURO</span>
          </button>
        )}
        <button className="btn" onClick={handleRefresh} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
          borderRadius: 8, border: '1px solid #E4EBF2', background: '#F4F7FB',
          color: '#0B1F3A', fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          <Icon name="refresh" size={13} color={refreshing ? '#00A6C8' : '#0B1F3A'} />
          {refreshing ? 'Actualizando…' : 'Actualizar'}
        </button>
      </div>
    </header>
  )
}

// ─── App Shell ────────────────────────────────────────────────────────────────
function AppShell({ children, current, scenario, onNavigate, headerProps, onPanel, onRefresh, showAI }: {
  children: React.ReactNode; current: Screen; scenario: Scenario; onNavigate: (s: Screen) => void
  headerProps: { title: string; breadcrumb?: string[]; description?: string }
  onPanel: (p: Panel) => void; onRefresh: () => void; showAI?: boolean
}) {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#F4F7FB' }}>
      <Sidebar current={current} scenario={scenario} onNavigate={onNavigate} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <AppHeader {...headerProps} scenario={scenario} onRefresh={onRefresh} onPanel={onPanel} showAI={showAI} />
        <main style={{ flex: 1, overflowY: 'auto', padding: 28 }} className="screen-enter">
          {children}
        </main>
      </div>
    </div>
  )
}

// ─── Domain card ─────────────────────────────────────────────────────────────
function DomainCard({ title, icon, status, text, note, onClick }: {
  title: string; icon: string; status: Status; text: string; note?: string; onClick?: () => void
}) {
  const cfg = SC[status]
  return (
    <div className={`card-hover`} onClick={onClick} style={{
      background: '#fff', borderRadius: 12, padding: '20px 22px',
      border: `1.5px solid ${cfg.border}`, cursor: onClick ? 'pointer' : 'default',
      position: 'relative', overflow: 'hidden', boxShadow: '0 2px 8px rgba(11,31,58,0.05)',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: cfg.color, borderRadius: '4px 0 0 4px' }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10, paddingLeft: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: `${cfg.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={icon} size={17} color={cfg.color} />
          </div>
          <span style={{ fontWeight: 700, fontSize: 14, color: '#0B1F3A' }}>{title}</span>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: '#4A6080', lineHeight: 1.55 }}>{text}</p>
        {note && <p style={{ margin: '6px 0 0', fontSize: 12, color: '#7A8793', lineHeight: 1.4 }}>{note}</p>}
        {onClick && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 12, color: '#00A6C8', fontSize: 12, fontWeight: 600 }}>
            Ver detalle <Icon name="chevronRight" size={12} color="#00A6C8" />
          </div>
        )}
      </div>
      <p style={{ margin: '0 0 0 6px', fontSize: 13, color: '#4A6080', lineHeight: 1.5 }}>{text}</p>
      {note && <p style={{ margin: '6px 0 0 6px', fontSize: 11, color: '#7A8793', lineHeight: 1.4 }}>{note}</p>}
      {onClick && <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 12, paddingLeft: 6, color: '#00A6C8', fontSize: 12, fontWeight: 600 }}>
        Ver detalle <Icon name="chevronRight" size={13} color="#00A6C8" />
      </div>}
    </div>
  )
}

// ─── Situación Principal block ────────────────────────────────────────────────
function SituacionPrincipal({ sd, scenario, onNavigate }: { sd: ScenarioData; scenario: Scenario; onNavigate: (s: Screen) => void }) {
  if (!sd.situacion) return (
    <div style={{ background: '#EDF7F1', border: '1.5px solid #B8E5C6', borderRadius: 14, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#35A853', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon name="check" size={20} color="#fff" />
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#1A6B33', marginBottom: 2 }}>Sin situaciones activas</div>
        <div style={{ fontSize: 13, color: '#2D8A4A' }}>Todos los servicios operan con normalidad. No hay acciones pendientes.</div>
      </div>
    </div>
  )
  const { situacion: s } = sd
  const bColors: Record<Scenario, { bg: string; border: string; badge: Status }> = {
    partial:     { bg: '#FFF8ED', border: '#FAD9A0', badge: 'warning' },
    degradation: { bg: '#FFF8ED', border: '#FAD9A0', badge: 'warning' },
    crisis:      { bg: '#FDF2F1', border: '#F0B8B6', badge: 'critical' },
    normal:      { bg: '#EDF7F1', border: '#B8E5C6', badge: 'ok' },
  }
  const bc = bColors[scenario]
  return (
    <div style={{ background: bc.bg, border: `1.5px solid ${bc.border}`, borderRadius: 14, padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="alert" size={18} color={SC[bc.badge].color} />
          <span style={{ fontWeight: 700, fontSize: 15, color: '#0B1F3A' }}>Situación principal</span>
        </div>
        <StatusBadge status={bc.badge} size="sm" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 28px', marginBottom: 14 }}>
        {[
          ['Servicio', s.servicio], ['Componente', s.componente],
          ['Situación', s.situacion], ['Alcance territorial', s.alcance],
          ['Impacto potencial', s.impacto], ['Acción en curso', s.accion],
        ].map(([l, v]) => (
          <div key={l}>
            <div style={{ fontSize: 10, color: '#7A8793', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>{l}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#0B1F3A', lineHeight: 1.4 }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: `1px solid ${bc.border}` }}>
        <div style={{ display: 'flex', gap: 24 }}>
          <div><span style={{ fontSize: 10, color: '#7A8793', fontWeight: 700 }}>RESPONSABLE: </span><span style={{ fontSize: 12, fontWeight: 700, color: '#0B1F3A' }}>{s.responsable}</span></div>
          <div><span style={{ fontSize: 10, color: '#7A8793', fontWeight: 700 }}>PRÓXIMA ACTUALIZACIÓN: </span><span style={{ fontSize: 12, fontWeight: 700, color: '#0B1F3A' }}>{s.proxima}</span></div>
        </div>
        <Btn variant="outline" small onClick={() => onNavigate('internet')}>
          Ver detalle <Icon name="chevronRight" size={12} color="#00A6C8" />
        </Btn>
      </div>
    </div>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return <div style={{ textAlign: 'center', padding: '24px 0 8px', fontSize: 10, color: '#B0BBC5' }}>Prototipo de experiencia | Datos simulados para validación visual, excepto donde se indique información operacional disponible</div>
}

// ─── SCREEN 2: Dashboard ──────────────────────────────────────────────────────
function DashboardScreen({ scenario, onNavigate, onPanel, onRefresh }: { scenario: Scenario; onNavigate: (s: Screen) => void; onPanel: (p: Panel) => void; onRefresh: () => void }) {
  const sd = SCENARIOS[scenario]
  
  // Añadimos Redes Sociales y Call Center aquí
  const domains = [
    { key: 'internet',      title: 'Internet',           icon: 'internet',   onClick: () => onNavigate('internet') },
    { key: 'conectividad',  title: 'Conectividad',       icon: 'network',    onClick: undefined },
    { key: 'serviciosTI',   title: 'Servicios TI',       icon: 'server',     onClick: undefined },
    { key: 'dataCenter',    title: 'Data Center',        icon: 'datacenter', onClick: undefined },
    { key: 'telefonia',     title: 'Telefonía y TV',     icon: 'phone',      onClick: undefined },
    { key: 'internos',      title: 'Servicios internos', icon: 'settings',   onClick: undefined },
    { key: 'redesSociales', title: 'Redes Sociales',     icon: 'star',       onClick: undefined }, // Nuevo
    { key: 'callCenter',    title: 'Call Center',        icon: 'phone',      onClick: undefined }, // Nuevo
  ]
  return (
    <AppShell current="dashboard" scenario={scenario} onNavigate={onNavigate}
      headerProps={{ title: 'Panel de Control de Crisis', description: sd.overallText }}
      onPanel={onPanel} onRefresh={onRefresh} showAI>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 12, fontWeight: 700, color: '#7A8793', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Dominios monitoreados</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
          {domains.map(d => { const dom = sd.domains[d.key]; return <DomainCard key={d.key} title={d.title} icon={d.icon} status={dom.status} text={dom.text} note={dom.note} onClick={d.onClick} /> })}
        </div>
        <h2 style={{ margin: '0 0 16px', fontSize: 12, fontWeight: 700, color: '#7A8793', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Situación principal</h2>
        <SituacionPrincipal sd={sd} scenario={scenario} onNavigate={onNavigate} />
      </div>
      <Footer />
    </AppShell>
  )
}

// ─── Dimension chip for service cards ─────────────────────────────────────────
function DimChip({ label, status }: { label: string; status: Status | 'pending' }) {
  if (status === 'pending') return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', background: '#F4F7FB', borderRadius: 8 }}>
      <span style={{ fontSize: 12, color: '#7A8793', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 11, color: '#7A8793', background: '#E8EDF2', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>Pendiente</span>
    </div>
  )
  const cfg = SC[status]
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', background: cfg.bg, borderRadius: 8, border: `1px solid ${cfg.border}` }}>
      <span style={{ fontSize: 12, color: '#0B1F3A', fontWeight: 600 }}>{label}</span>
      <StatusBadge status={status} size="sm" />
    </div>
  )
}

// ─── SCREEN 3: Internet detail ────────────────────────────────────────────────
function InternetScreen({ scenario, onNavigate, onPanel, onRefresh }: { scenario: Scenario; onNavigate: (s: Screen) => void; onPanel: (p: Panel) => void; onRefresh: () => void }) {
  const sd = SCENARIOS[scenario]
  const inet = sd.internet
  const dns = sd.dns

  function ServiceCard({ name, status, text, isActive, dims, onNav }: {
    name: string; status: Status; text: string; isActive: boolean
    dims?: { infra: Status | 'pending'; calidad: Status | 'pending'; capacidad: Status | 'pending' }
    onNav?: () => void
  }) {
    const cfg = SC[status]
    const isGray = status === 'incorporating' || status === 'nodata' || status === 'elevating'
    return (
      <div className={isActive ? 'card-hover' : ''} onClick={isActive ? onNav : undefined}
        style={{ background: '#fff', borderRadius: 14, padding: '24px 22px 20px', border: `1.5px solid ${cfg.border}`, cursor: isActive ? 'pointer' : 'default', boxShadow: '0 2px 10px rgba(11,31,58,0.06)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: cfg.color, borderRadius: '14px 14px 0 0', opacity: isGray ? 0.4 : 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0B1F3A' }}>{name}</h3>
          <StatusBadge status={status} size="md" />
        </div>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: isGray ? '#7A8793' : '#4A6080', lineHeight: 1.6 }}>{text}</p>
        {dims && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <DimChip label="Infraestructura" status={dims.infra} />
            <DimChip label="Calidad" status={dims.calidad} />
            <DimChip label="Capacidad" status={dims.capacidad} />
          </div>
        )}
        {isActive && (
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${cfg.border}`, display: 'flex', justifyContent: 'flex-end' }}>
            <Btn variant="primary" small onClick={onNav}>Ver detalle ejecutivo</Btn>
          </div>
        )}
      </div>
    )
  }

  const dnsDims = {
    infra:    dns.infraestructura.status,
    calidad:  dns.calidad.status,
    capacidad:dns.capacidad.status,
  }

  return (
    <AppShell current="internet" scenario={scenario} onNavigate={onNavigate}
      headerProps={{ title: 'Internet | Estado ejecutivo', breadcrumb: ['Panel general', 'Internet'] }}
      onPanel={onPanel} onRefresh={onRefresh} showAI>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <button className="btn" onClick={() => onNavigate('dashboard')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px solid #E4EBF2', borderRadius: 8, padding: '6px 12px', color: '#7A8793', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            <Icon name="arrowLeft" size={13} /> Volver al panel general
          </button>
        </div>
        <div style={{ background: '#F0FAFD', border: '1px solid #A0DFF0', borderRadius: 10, padding: '12px 18px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="alert" size={15} color="#00A6C8" />
          <span style={{ fontSize: 13, color: '#0B5E70', fontWeight: 500 }}>
            Actualmente se dispone de información para <strong>DNS</strong>. DHCP y Tránsito se encuentran en incorporación.
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 20 }}>
          <ServiceCard name="DNS" status={inet.dns}
            text="Indicadores de infraestructura, calidad y capacidad disponibles."
            isActive={inet.dns !== 'incorporating' && inet.dns !== 'nodata'}
            dims={dnsDims} onNav={() => onNavigate('dns-exec')}
          />
          <ServiceCard name="DHCP" status={inet.dhcp}
            text="Integración de información en preparación."
            isActive={false}
            dims={{ infra: 'pending', calidad: 'pending', capacidad: 'pending' }}
          />
          <ServiceCard name="Tránsito IP" status={inet.transito}
            text="Integración de información en preparación."
            isActive={false}
            dims={{ infra: 'pending', calidad: 'pending', capacidad: 'pending' }}
          />
          <ServiceCard name="DHCP" status={inet.dhcp} text="Integración de información en preparación." />
          <ServiceCard name="Tránsito IP" status={inet.transito} text="Integración de información en preparación." />
        </div>
        <div style={{ background: '#F4F7FB', border: '1px solid #E4EBF2', borderRadius: 10, padding: '12px 18px', fontSize: 13, color: '#4A6080' }}>
          <strong>Cobertura actual del panel:</strong> DNS disponible. DHCP y Tránsito pendientes de integración.
        </div>
      </div>
      <Footer />
    </AppShell>
  )
}

// ─── SCREEN 4: DNS Executive ──────────────────────────────────────────────────
function DNSExecScreen({ scenario, onNavigate, onPanel, onRefresh }: { scenario: Scenario; onNavigate: (s: Screen) => void; onPanel: (p: Panel) => void; onRefresh: () => void }) {
  const sd = SCENARIOS[scenario]
  const dns = sd.dns
  const now = useNow()

  function DimCard({ title, tooltip, data }: { title: 'Infraestructura' | 'Calidad' | 'Capacidad'; tooltip: string; data: DimData }) {
    const cfg = SC[data.status]
    return (
      <div style={{ background: '#fff', borderRadius: 14, padding: '22px 22px 20px', border: `1.5px solid ${cfg.border}`, boxShadow: '0 2px 8px rgba(11,31,58,0.05)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: cfg.color, borderRadius: '14px 14px 0 0' }} />
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#0B1F3A', marginBottom: 2 }}>{title}</div>
            <div className="tooltip-wrap" style={{ display: 'inline-block' }}>
              <span style={{ fontSize: 11, color: '#7A8793', cursor: 'help', borderBottom: '1px dashed #C5CDD5' }}>{tooltip}</span>
              <span className="tooltip">{tooltip}</span>
            </div>
          </div>
          <StatusBadge status={data.status} size="md" />
        </div>
        <p style={{ margin: '14px 0 10px', fontSize: 13, color: '#4A6080', lineHeight: 1.6 }}>{data.desc}</p>
        <div style={{ padding: '10px 14px', background: cfg.bg, borderRadius: 9, fontSize: 12, color: '#0B1F3A', fontWeight: 600, lineHeight: 1.5 }}>
          {data.detail}
        </div>
      </div>
    )
  }

  const dimTooltips: Record<string, string> = {
    Infraestructura: 'Indica si los componentes necesarios para prestar el servicio se encuentran operativos',
    Calidad:         'Indica si el servicio funciona correctamente y con tiempos de respuesta adecuados',
    Capacidad:       'Indica si existen recursos suficientes para mantener la operación actual',
  }

  return (
    <AppShell current="dns-exec" scenario={scenario} onNavigate={onNavigate}
      headerProps={{ title: 'DNS | Estado ejecutivo', breadcrumb: ['Panel general', 'Internet', 'DNS'] }}
      onPanel={onPanel} onRefresh={onRefresh} showAI>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Back + actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <button className="btn" onClick={() => onNavigate('internet')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px solid #E4EBF2', borderRadius: 8, padding: '6px 12px', color: '#7A8793', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            <Icon name="arrowLeft" size={13} /> Volver a Internet
          </button>
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn variant="ghost" small onClick={() => onPanel('protocol')}><Icon name="shield" size={13} /> Ver protocolo</Btn>
            <Btn variant="ghost" small onClick={() => onNavigate('dns-tech')}><Icon name="externalLink" size={13} /> Ver detalle técnico</Btn>
          </div>
        </div>

        {/* Status header card */}
        <div style={{ background: SC[dns.globalStatus].bg, border: `1.5px solid ${SC[dns.globalStatus].border}`, borderRadius: 14, padding: '20px 24px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: SC[dns.globalStatus].color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name={dns.globalStatus === 'ok' ? 'check' : dns.globalStatus === 'critical' ? 'x' : 'alert'} size={22} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <StatusBadge status={dns.globalStatus} size="md" />
              <span style={{ fontSize: 12, color: '#7A8793' }}>Última actualización: {fmtTime(now)}</span>
            </div>
            <p style={{ margin: 0, fontSize: 14, color: '#0B1F3A', fontWeight: 500, lineHeight: 1.5 }}>{dns.globalDesc}</p>
          </div>
        </div>

        {/* Dimension cards */}
        <h2 style={{ margin: '0 0 14px', fontSize: 12, fontWeight: 700, color: '#7A8793', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ámbitos del servicio</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
          <DimCard title="Infraestructura" tooltip={dimTooltips.Infraestructura} data={dns.infraestructura} />
          <DimCard title="Calidad"         tooltip={dimTooltips.Calidad}         data={dns.calidad} />
          <DimCard title="Capacidad"       tooltip={dimTooltips.Capacidad}       data={dns.capacidad} />
        </div>

        {/* Territory */}
        <h2 style={{ margin: '0 0 14px', fontSize: 12, fontWeight: 700, color: '#7A8793', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Cobertura territorial</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
          {[dns.zonaCN, dns.zonaSur].map((z, i) => {
            const cfg = SC[z.status]
            return (
              <div key={i} style={{ background: cfg.bg, border: `1.5px solid ${cfg.border}`, borderRadius: 12, padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon name="mapPin" size={14} color={cfg.color} />
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#0B1F3A' }}>{i === 0 ? 'Zona Centro-Norte' : 'Zona Sur'}</span>
                  </div>
                  <StatusBadge status={z.status} size="sm" />
                </div>
                <div style={{ fontSize: 13, color: '#4A6080', marginBottom: 4 }}>{z.desc}</div>
                <div style={{ fontSize: 12, color: '#7A8793' }}><span style={{ fontWeight: 600 }}>Ubicaciones: </span>{z.locations}</div>
              </div>
            )
          })}
        </div>

        {/* Decision block */}
        <h2 style={{ margin: '0 0 14px', fontSize: 12, fontWeight: 700, color: '#7A8793', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Información para la decisión</h2>
        <div style={{ background: '#fff', border: '1.5px solid #E4EBF2', borderRadius: 14, padding: '24px', boxShadow: '0 2px 8px rgba(11,31,58,0.05)', marginBottom: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 32px' }}>
            {[
              { l: 'Qué está ocurriendo', v: dns.queOcurre },
              { l: 'Impacto potencial',   v: dns.impacto },
              { l: 'Acción en curso',     v: dns.accion },
              { l: 'Responsable',         v: dns.responsable },
            ].map(({ l, v }) => (
              <div key={l}>
                <div style={{ fontSize: 11, color: '#00A6C8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>{l}</div>
                <div style={{ fontSize: 13, color: '#0B1F3A', lineHeight: 1.6 }}>{v}</div>
              </div>
            ))}
            <div style={{ gridColumn: '1 / -1', paddingTop: 12, borderTop: '1px solid #E4EBF2', display: 'flex', gap: 28 }}>
              <div><span style={{ fontSize: 11, color: '#7A8793', fontWeight: 700 }}>PRÓXIMA ACTUALIZACIÓN: </span><span style={{ fontSize: 13, fontWeight: 700, color: '#0B1F3A' }}>{dns.proxima}</span></div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <Btn variant="secondary" onClick={() => onNavigate('dns-tech')}><Icon name="externalLink" size={14} color="#fff" /> Ver detalle técnico</Btn>
          <Btn variant="ghost" onClick={() => onPanel('protocol')}><Icon name="shield" size={14} /> Ver protocolo de respuesta</Btn>
          <Btn variant="ghost" onClick={() => {}}><Icon name="user" size={14} /> Contactar responsable</Btn>
        </div>
      </div>
      <Footer />
    </AppShell>
  )
}

// ─── SCREEN 5: DNS Technical ──────────────────────────────────────────────────
function DNSTechScreen({ scenario, onNavigate }: { scenario: Scenario; onNavigate: (s: Screen) => void }) {
  const servers = getServers(scenario)
  const now = useNow()
  const [filterZone, setFilterZone] = useState('Todas')
  const filtered = filterZone === 'Todas' ? servers : servers.filter(s => s.zone === filterZone)
  const COLORS = ['#00A6C8','#35A853','#F5A623','#D64541']
  const allData = servers.map(s => s.data)
  const cW = 540, cH = 110
  const allVals = allData.flat().filter(v => v > 0)
  const maxVal = allVals.length ? Math.max(...allVals) : 200
  function toY(v: number) { return cH - (v / maxVal) * (cH - 12) - 6 }
  function toX(i: number) { return (i / 9) * cW }
  const xLabels = ['-30','-27','-24','-21','-18','-15','-12','-9','-6','Ahora']

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#101E30', color: '#E8EDF2' }}>
      {/* Dark sidebar */}
      <aside style={{ width: 220, background: '#080F1E', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: '#00A6C8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="shield" size={14} color="#fff" /></div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#E8EDF2' }}>Proyecto AIP</span>
          </div>
          <div style={{ background: 'rgba(245,166,35,0.15)', border: '1px solid rgba(245,166,35,0.3)', borderRadius: 6, padding: '6px 10px', fontSize: 11, color: '#F5A623', fontWeight: 600 }}>Vista técnica · Especialistas</div>
        </div>
        <nav style={{ flex: 1, padding: 8 }}>
          {[{ label: 'Vista ejecutiva', icon: 'arrowLeft', action: () => onNavigate('dns-exec') }, { label: 'Panel general', icon: 'home', action: () => onNavigate('dashboard') }].map(item => (
            <button key={item.label} onClick={item.action} className="sidebar-item" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, border: 'none', background: 'transparent', color: '#7A9BB5', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 2 }}>
              <Icon name={item.icon} size={14} /> {item.label}
            </button>
          ))}
        </nav>
        <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 10, color: '#2A4060' }}>Acceso restringido — Uso especialista</div>
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ background: '#0A1624', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#E8EDF2' }}>DNS | Detalle técnico</span>
            <StatusBadge status={SCENARIOS[scenario].dns.globalStatus} size="sm" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, color: '#4A6080', fontFamily: 'JetBrains Mono, monospace' }}>{fmtDate(now)} {fmtTime(now)}</span>
            <button className="btn" style={{ background: '#00A6C8', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="externalLink" size={12} color="#fff" /> Abrir en Kibana
            </button>
          </div>
        </div>
        <main style={{ flex: 1, overflowY: 'auto', padding: 24 }} className="screen-enter">
          {/* Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, padding: '12px 18px', background: '#0A1624', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
            <Icon name="filter" size={14} color="#7A9BB5" />
            <span style={{ fontSize: 12, color: '#7A9BB5', fontWeight: 600 }}>Territorio:</span>
            {['Todas','Zona Centro-Norte','Zona Sur'].map(z => (
              <button key={z} onClick={() => setFilterZone(z)} style={{ padding: '4px 12px', borderRadius: 16, border: `1px solid ${filterZone === z ? '#00A6C8' : 'rgba(255,255,255,0.1)'}`, background: filterZone === z ? 'rgba(0,166,200,0.15)' : 'transparent', color: filterZone === z ? '#00A6C8' : '#7A9BB5', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{z}</button>
            ))}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              {['Tiempo real','Última hora','6 horas'].map(p => (
                <button key={p} style={{ padding: '4px 10px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', background: p === 'Tiempo real' ? 'rgba(255,255,255,0.06)' : 'transparent', color: '#7A9BB5', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>{p}</button>
              ))}
            </div>
          </div>
          {/* Chart */}
          <div style={{ background: '#0A1624', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#E8EDF2' }}>Tiempo de respuesta (ms) — últimos 30 min</span>
              <div style={{ display: 'flex', gap: 12 }}>
                {servers.map((s, i) => <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 16, height: 2, background: COLORS[i], borderRadius: 2 }} /><span style={{ fontSize: 10, color: '#7A9BB5', fontFamily: 'JetBrains Mono, monospace' }}>{s.name}</span></div>)}
              </div>
            </div>
            <svg width="100%" height={cH} viewBox={`0 0 ${cW} ${cH}`} preserveAspectRatio="none" style={{ display: 'block' }}>
              {[0,25,50,75,100].map(p => { const y = cH - (p/100)*(cH-12)-6; return <line key={p} x1={0} y1={y} x2={cW} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth={1} /> })}
              {allData.map((data, si) => { if (!data.length) return null; const pts = data.map((v, xi) => `${toX(xi)},${toY(v)}`).join(' '); return <polyline key={si} points={pts} fill="none" stroke={COLORS[si]} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" /> })}
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              {xLabels.map(l => <span key={l} style={{ fontSize: 9, color: '#3A5070', fontFamily: 'JetBrains Mono, monospace' }}>{l}m</span>)}
            </div>
          </div>

          {/* Servers table */}
          <div style={{ background: '#0A1624', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#E8EDF2' }}>Componentes monitoreados</span>
              <span style={{ fontSize: 11, color: '#4A6080', fontFamily: 'monospace', alignSelf: 'center' }}>({filtered.length}/{servers.length})</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Componente','Ubicación','Zona','Estado','T. respuesta','Disponibilidad','Tendencia','Actualización'].map(h => (
                    <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, color: '#4A6080', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'monospace' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: '#E8EDF2', fontFamily: 'monospace' }}>{s.name}</td>
                    <td style={{ padding: '12px 14px', fontSize: 12, color: '#9BAEC0' }}>{s.location}</td>
                    <td style={{ padding: '12px 14px', fontSize: 11, color: '#7A9BB5' }}>{s.zone}</td>
                    <td style={{ padding: '12px 14px' }}><StatusBadge status={s.status} size="sm" /></td>
                    <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: s.ms > 100 ? '#F5A623' : s.ms === 0 ? '#D64541' : '#35A853', fontFamily: 'monospace' }}>{s.status === 'nodata' ? '–' : s.ms === 0 ? 'N/D' : `${s.ms} ms`}</td>
                    <td style={{ padding: '12px 14px', fontSize: 12, color: '#9BAEC0', fontFamily: 'monospace' }}>{s.avail}</td>
                    <td style={{ padding: '12px 14px' }}><Sparkline data={s.data} color={COLORS[i % 4]} width={72} height={28} /></td>
                    <td style={{ padding: '12px 14px', fontSize: 11, color: '#4A6080', fontFamily: 'monospace' }}>{fmtTime(now)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Indicators */}
          <div style={{ background: '#0A1624', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}><span style={{ fontSize: 13, fontWeight: 700, color: '#E8EDF2' }}>Indicadores</span></div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{['Indicador','Descripción','Valor actual','Umbral','Estado'].map(h => <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, color: '#4A6080', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'monospace' }}>{h}</th>)}</tr></thead>
              <tbody>
                {[
                  { ind: 'dns.query.latency',  desc: 'Latencia de consultas DNS',    val: scenario==='crisis'?'N/D':scenario==='degradation'?'147ms':'16ms',    thr:'< 50ms',  st: scenario==='crisis'?'critical' as Status:scenario==='degradation'?'warning' as Status:'ok' as Status },
                  { ind: 'dns.availability',    desc: 'Disponibilidad del servicio', val: scenario==='crisis'?'62%':scenario==='degradation'?'98.0%':'99.97%',   thr:'> 99.9%', st: scenario==='crisis'?'critical' as Status:scenario==='degradation'?'warning' as Status:'ok' as Status },
                  { ind: 'dns.query.rate',      desc: 'Tasa de consultas/seg',       val: '18.4k rps',    thr:'< 50k rps', st:'ok' as Status },
                  { ind: 'dns.error.rate',      desc: 'Tasa de errores',             val: scenario==='crisis'?'38.2%':scenario==='degradation'?'2.1%':'0.02%',   thr:'< 1%',    st: scenario==='crisis'?'critical' as Status:scenario==='degradation'?'warning' as Status:'ok' as Status },
                  { ind: 'dns.cache.hit.ratio', desc: 'Tasa de acierto en caché',   val: '94.1%',        thr:'> 80%',     st:'ok' as Status },
                ].map(r => (
                  <tr key={r.ind} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '10px 14px', fontSize: 11, color: '#9BAEC0', fontFamily: 'monospace' }}>{r.ind}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: '#7A9BB5' }}>{r.desc}</td>
                    <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: SC[r.st].color, fontFamily: 'monospace' }}>{r.val}</td>
                    <td style={{ padding: '10px 14px', fontSize: 11, color: '#4A6080', fontFamily: 'monospace' }}>{r.thr}</td>
                    <td style={{ padding: '10px 14px' }}><StatusBadge status={r.st} size="sm" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: 10, color: '#2A3A4A', textAlign: 'center', paddingBottom: 8 }}>Prototipo de experiencia | Datos simulados para validación visual, excepto donde se indique información operacional disponible</div>
        </main>
      </div>
    </div>
  )
}

// ─── Protocol Modal ───────────────────────────────────────────────────────────
function ProtocolModal({ scenario, onClose }: { scenario: Scenario; onClose: () => void }) {
  const sd = SCENARIOS[scenario]
  const sit = sd.situacion
  const now = useNow()
  const sevStatus: Status = scenario==='crisis'?'critical':scenario==='degradation'?'warning':'ok'
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(6,15,30,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}>
      <div className="modal-enter" onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 560, boxShadow: '0 24px 64px rgba(11,31,58,0.25)', overflow: 'hidden', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ background: '#0B1F3A', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Icon name="shield" size={18} color="#00A6C8" /><span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Protocolo de respuesta</span></div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#7A9BB5', cursor: 'pointer', padding: 4 }}><Icon name="x" size={18} /></button>
        </div>
        <div style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 11, color: '#7A8793', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Nombre del incidente</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0B1F3A' }}>{scenario==='normal'?'Sin incidente activo':`INC-${now.getFullYear()}-DNS-${scenario==='crisis'?'001':'004'}`}</div>
            </div>
            <div style={{ textAlign: 'right' }}><div style={{ fontSize: 11, color: '#7A8793', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Severidad</div><StatusBadge status={sevStatus} size="md" /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px', marginBottom: 20 }}>
            {[
              { l: 'Servicio afectado',        v: sit?.servicio ?? 'Sin afectación' },
              { l: 'Componente',               v: sit?.componente ?? '–' },
              { l: 'Acción inicial recomendada', v: sit?.accion ?? 'Continuar monitoreo estándar' },
              { l: 'Estado de la acción', v: scenario==='crisis'?'En ejecución — urgente':scenario==='degradation'?'En evaluación':'Sin acción requerida' },
              { l: 'Responsable principal', v: 'Operación Internet' },
              { l: 'Responsable de respaldo', v: 'Gerencia de Infraestructura' },
              { l: 'Hora de inicio', v: `${fmtDate(now)}, ${fmtTime(now)}` },
              { l: 'Próxima actualización', v: sit?.proxima ?? '30 minutos' },
            ].map(({ l, v }) => (
              <div key={l}><div style={{ fontSize: 11, color: '#7A8793', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{l}</div><div style={{ fontSize: 13, color: '#0B1F3A', fontWeight: 500, lineHeight: 1.4 }}>{v}</div></div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, paddingTop: 16, borderTop: '1px solid #E4EBF2' }}>
            <Btn variant="primary" onClick={onClose}><Icon name="check" size={14} color="#fff" /> Marcar como revisado</Btn>
            <Btn variant="ghost"><Icon name="externalLink" size={14} /> Abrir procedimiento completo</Btn>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── AI Panel ─────────────────────────────────────────────────────────────────
function AIPanel({ scenario, onClose }: { scenario: Scenario; onClose: () => void }) {
  const sd = SCENARIOS[scenario]
  const sit = sd.situacion
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(6,15,30,0.4)', display: 'flex', justifyContent: 'flex-end', zIndex: 1000 }}>
      <div className="panel-enter" onClick={e => e.stopPropagation()} style={{ background: '#fff', width: 420, height: '100%', boxShadow: '-12px 0 40px rgba(11,31,58,0.18)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ background: '#0B1F3A', padding: '20px 20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: '#00A6C8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="brain" size={15} color="#fff" /></div>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Asistente AIP</span>
              <span style={{ background: 'rgba(245,166,35,0.2)', border: '1px solid rgba(245,166,35,0.4)', color: '#F5A623', fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 10, letterSpacing: '0.07em' }}>EVOLUCIÓN FUTURA</span>
            </div>
            <div style={{ fontSize: 11, color: '#7A9BB5' }}>Análisis automático de la situación en curso</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#7A9BB5', cursor: 'pointer', padding: 4 }}><Icon name="x" size={16} /></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          <div style={{ background: '#FFF8ED', border: '1px solid #FAD9A0', borderRadius: 8, padding: '10px 12px', marginBottom: 18, fontSize: 11, color: '#8A5800', lineHeight: 1.5 }}>
            <strong>Nota:</strong> Las recomendaciones son informativas. La decisión final corresponde al Comité de Crisis.
          </div>
          {/* SECCIÓN CORREGIDA: Nota cómo el array termina en ] y el .map ocurre antes de cerrar la llave } al final */}
        {[
          { t: 'Resumen automático', i: 'star', c: <p style={{ margin: 0, fontSize: 13, color: '#0B1F3A', lineHeight: 1.6 }}>{sit?`Se detecta ${sd.overallStatus==='critical'?'una afectación crítica':'una degradación'} en el servicio DNS. ${sit.situacion}. El alcance comprende ${sit.alcance}.`:'Todos los servicios operan dentro de los parámetros normales.'}</p> },
          
          { t: 'Análisis Predictivo', i: 'eye', c: <div style={{ fontSize: 12, color: '#4A6080', lineHeight: 1.5, background: '#F0FAFD', padding: 10, borderRadius: 8, borderLeft: '3px solid #00A6C8' }}>Proyección a 30 mins: Alta probabilidad (82%) de saturación en Call Center por consultas de clientes en Zona Sur. Riesgo de latencia en servicios dependientes.</div> },
          
          { t: 'Medidas Preventivas', i: 'shield', c: <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{['Desviar tráfico de Zona Sur a servidores de respaldo', 'Activar IVR informativo preventivo en Call Center', 'Publicar aviso de intermitencia en RRSS'].map((s,i) => <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#F4F7FB', borderRadius: 7, fontSize: 12, color: '#4A6080' }}><div style={{ width: 6, height: 6, borderRadius: '50%', background: '#F5A623', flexShrink: 0 }} />{s}</div>)}</div> },
          
          { t: 'Posible impacto', i: 'alert', c: <p style={{ margin: 0, fontSize: 13, color: '#0B1F3A', lineHeight: 1.6 }}>{sit?.impacto??'Sin impacto estimado en el estado actual.'}</p> },
          
          { t: 'Acciones recomendadas', i: 'check', c: <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{(sit?['Confirmar estado con responsable técnico','Evaluar necesidad de comunicación a clientes','Revisar protocolo de respuesta activo']:['Continuar monitoreo estándar','Verificar cobertura de indicadores pendientes']).map((a,i) => <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: '#0B1F3A', lineHeight: 1.5 }}><div style={{ width: 18, height: 18, borderRadius: '50%', background: '#00A6C8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}><Icon name="check" size={10} color="#fff" /></div>{a}</div>)}</div> },
        ].map(({ t, i, c }) => (
          <div key={t} style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <Icon name={i as any} size={14} color="#00A6C8" />
              <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0B1F3A', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t}</h4>
            </div>
            {c}
          </div>
        ))}
          <div style={{ background: '#F4F7FB', border: '1px solid #E4EBF2', borderRadius: 10, padding: 14, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#0B1F3A' }}>Nivel de confianza</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#35A853' }}>78%</span>
            </div>
            <div style={{ height: 6, background: '#E4EBF2', borderRadius: 3, overflow: 'hidden' }}><div style={{ width: '78%', height: '100%', background: '#35A853', borderRadius: 3 }} /></div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}><Icon name="externalLink" size={13} color="#00A6C8" /><span style={{ fontSize: 11, fontWeight: 700, color: '#7A8793', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Fuentes utilizadas</span></div>
            {['Datos DNS en tiempo real','Historial de incidentes','Protocolo de respuesta v3.1'].map(f => <div key={f} style={{ fontSize: 11, color: '#7A8793', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}><div style={{ width: 4, height: 4, borderRadius: '50%', background: '#C5CDD5' }} /> {f}</div>)}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── App Root ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState<Screen>('login')
  const [scenario, setScenario] = useState<Scenario>('partial')
  const [panel, setPanel] = useState<Panel>(null)

  const navigate = useCallback((s: Screen) => { setScreen(s); setPanel(null) }, [])
  const openPanel = useCallback((p: Panel) => setPanel(p), [])
  const closePanel = useCallback(() => setPanel(null), [])
  const refresh = useCallback(() => {}, [])

  const sharedProps = { scenario, onNavigate: navigate, onPanel: openPanel, onRefresh: refresh }

  const screenNode = (() => {
    switch (screen) {
      case 'login':    return <LoginScreen onLogin={() => navigate('dashboard')} scenario={scenario} onScenarioChange={setScenario} />
      case 'dashboard':return <DashboardScreen {...sharedProps} />
      case 'internet': return <InternetScreen {...sharedProps} />
      case 'dns-exec': return <DNSExecScreen {...sharedProps} />
      case 'dns-tech': return <DNSTechScreen scenario={scenario} onNavigate={navigate} />
    }
  })()

  return (
    <>
      {/* Floating scenario switcher for non-login screens */}
      {screen !== 'login' && panel === null && (
        <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 500, display: 'flex', gap: 5, background: '#0B1F3A', borderRadius: 20, padding: '7px 12px', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
          <span style={{ fontSize: 10, color: '#7A9BB5', fontWeight: 600, alignSelf: 'center', paddingRight: 4 }}>Escenario:</span>
          {(['partial','normal','degradation','crisis'] as Scenario[]).map(s => (
            <button key={s} onClick={() => setScenario(s)} style={{
              padding: '3px 10px', borderRadius: 14, border: `1px solid ${scenario === s ? SC[SCENARIOS[s].overallStatus].color : 'rgba(255,255,255,0.12)'}`,
              background: scenario === s ? `${SC[SCENARIOS[s].overallStatus].color}22` : 'transparent',
              color: scenario === s ? SC[SCENARIOS[s].overallStatus].color : '#7A9BB5',
              fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>{SCENARIOS[s].label}</button>
          ))}
        </div>
      )}
      {screenNode}
      {panel === 'protocol' && <ProtocolModal scenario={scenario} onClose={closePanel} />}
      {panel === 'ai'       && <AIPanel scenario={scenario} onClose={closePanel} />}
    </>
  )
}
