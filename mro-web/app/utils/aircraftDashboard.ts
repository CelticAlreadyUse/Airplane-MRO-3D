import { DEMO_AIRCRAFT_ID, type Finding } from '../types/findings'
import { getFindingSeverity, severityOrder, severityRank } from '../types/severity'
import { inventoryWithRequests, materialQuantities } from './materialRequests'
import { maintenancePlans, maintenanceDue, stockState } from '../data/operations'

/** Projections only: no stored counters and no changes to stock or work state. */
export function aircraftDashboard(records:readonly Finding[]) {
  const findings=records.filter(f=>f.aircraftId===DEMO_AIRCRAFT_ID)
  const active=findings.filter(f=>f.status!=='closed')
  const attention=[...active].sort((a,b)=>severityRank[getFindingSeverity(b)]-severityRank[getFindingSeverity(a)]||b.updatedAt.localeCompare(a.updatedAt)||a.id.localeCompare(b.id))
  const requests=findings.flatMap(finding=>(finding.materialRequests??[]).map(request=>({finding,request})))
  const requested=requests.filter(r=>r.request.status==='requested').length
  const ready=requests.filter(r=>r.request.status==='ready').length
  const unsettled=requests.filter(r=>materialQuantities(r.request).remaining>0).length
  const stock=inventoryWithRequests(findings)
  const plans=maintenancePlans.map(plan=>({...plan,due:maintenanceDue(plan)}))
  return {
    total:findings.length,active:active.length,urgent:active.filter(f=>['high','critical'].includes(getFindingSeverity(f))).length,
    review:active.filter(f=>f.status==='awaiting_review').length,closed:findings.length-active.length,
    severities:[...severityOrder].reverse().map(severity=>({severity,count:active.filter(f=>getFindingSeverity(f)===severity).length})),
    attention:attention.slice(0,5),requested,ready,unsettled,pendingMaterials:requested+ready+unsettled,
    lowStock:stock.filter(part=>stockState(part)!=='available').length,
    due:plans.filter(plan=>plan.due.status==='due').length,soon:plans.filter(plan=>plan.due.status==='soon').length,
    plans:plans.filter(plan=>plan.due.status!=='planned'),
    recent:findings.flatMap(finding=>finding.history.map(event=>({finding,event}))).sort((a,b)=>b.event.at.localeCompare(a.event.at)||a.event.id.localeCompare(b.event.id)).slice(0,5),
  }
}
