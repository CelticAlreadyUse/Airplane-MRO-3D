export const findingSeverities={unassessed:'Belum dinilai',low:'Rendah',medium:'Sedang',high:'Tinggi',critical:'Kritis'} as const
export type FindingSeverity=keyof typeof findingSeverities
export const severityOrder:FindingSeverity[]=['unassessed','low','medium','high','critical']
export const severityRank:Record<FindingSeverity,number>={unassessed:0,low:1,medium:2,high:3,critical:4}
export const severityColors:Record<FindingSeverity,string>={unassessed:'#94a3b8',low:'#f2c230',medium:'#ff8c1a',high:'#ff493b',critical:'#c02655'}
export function isFindingSeverity(value:unknown):value is FindingSeverity{return typeof value==='string' && Object.hasOwn(findingSeverities,value)}
export function getFindingSeverity(finding:{severity?:FindingSeverity}):FindingSeverity{return isFindingSeverity(finding.severity)?finding.severity:'unassessed'}
export interface ComponentSeveritySummary {severity:FindingSeverity;count:number;unassessed:number}
export function summarizeActiveSeverities(findings:readonly {assetId:string;status:string;severity?:FindingSeverity}[]):Map<string,ComponentSeveritySummary>{
 const result=new Map<string,ComponentSeveritySummary>()
 for(const finding of findings){
  if(finding.status==='closed')continue
  const severity=getFindingSeverity(finding),summary=result.get(finding.assetId)??{severity:'unassessed',count:0,unassessed:0}
  summary.count++
  if(severity==='unassessed')summary.unassessed++
  if(severityRank[severity]>severityRank[summary.severity])summary.severity=severity
  result.set(finding.assetId,summary)
 }
 return result
}
export function severitySummaryLabel(summary:ComponentSeveritySummary){return `${summary.count} temuan aktif · tingkat tertinggi yang dinilai: ${findingSeverities[summary.severity]}${summary.unassessed?` · ${summary.unassessed} belum dinilai`:''}`}
