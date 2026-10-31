export type WorkspaceTab='dashboard'|'aircraft'|'manuals'|'work'|'inventory'|'flights'|'maintenance'
export interface RecordDetails {
  eyebrow:string
  title:string
  description:string
  fields:{label:string;value:string}[]
  note?:string
}

export interface WorkspaceNavigation {
  id:number
  tab:WorkspaceTab
  work?:{status?:'all'|'active'|import('./findings').FindingStatus;severity?:'all'|'urgent'|import('./severity').FindingSeverity}
  stock?:'all'|'attention'
  requests?:'pending'|'all'|'requested'|'ready'|'unsettled'
  findingId?:string
  maintenance?:'all'|'attention'|'due'|'soon'|'planned'
}
export type WorkspaceDestination=Omit<WorkspaceNavigation,'id'>
