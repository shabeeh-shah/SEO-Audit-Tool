import {calculateScores,CHECKS,type CheckId} from '@/lib/audit/scoring';
import {categories,type Audit} from '@/lib/audit/types';

const statusLabel={critical:'Critical · 0',improvement:'Improvement · 55',good:'Good · 100',optional:'Optional'} as const;

export default function ScoreCalculation({audit}:{audit:Audit}){
 const {calculations}=calculateScores(audit.findings);
 return <section className="score-calculation" aria-labelledby="score-calculation-title">
  <div className="score-calculation-heading"><div><span className="eyebrow light">TRANSPARENT SCORING</span><h2 id="score-calculation-title">How this score was calculated</h2><p>Good earns 100 points, Improvement earns 55, and Critical earns 0. Each result is multiplied by its documented weight. Optional and advisory checks remain visible but contribute no points.</p></div><strong>{audit.score}<small>/100 overall</small></strong></div>
  <div className="score-calculation-categories">{calculations.map(calculation=><details key={calculation.category}><summary><span>{categories[calculation.category]}</span><b>{calculation.score}/100</b><small>{calculation.earned.toLocaleString()} of {calculation.maximum.toLocaleString()} weighted points</small></summary><div className="score-contribution-list">{calculation.checks.map(({finding,points,earned,maximum,included})=><div className="score-contribution" key={finding.id}><span><b>{CHECKS[finding.id as CheckId]?.label||finding.title}</b><small>{finding.evidence}</small></span><em className={finding.status}>{statusLabel[finding.status]}</em><strong>{included?`${finding.weight} × ${points} = ${earned} / ${maximum}`:'Not scored'}</strong></div>)}</div></details>)}</div>
  <p className="score-formula-note">Each category is a weighted average. The overall score is the simple average of SEO, Content, AI / GEO, and Performance.</p>
 </section>;
}
