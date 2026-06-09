import React from 'react';
import { useProject } from '../../context/ProjectContext.js';
import { useAuth } from '../../context/AuthContext.js';
import { calculateFpaTotalMetrics, calculateCosmicTotalMetrics, calculateHybridTotalMetrics, calculateOverheadImpacts } from '../../lib/engines.js';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx/xlsx.mjs';
import {
  FileDown,
  BarChart4,
  TableProperties,
  FileText,
  Sparkles,
  HelpCircle,
  Coins,
  Briefcase,
  Layers,
  Award,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { SaudiRiyalIcon } from '../icons/SaudiRiyalIcon.js';

export default function ComparativeDashboard() {
  const { currentProject } = useProject();
  const { profile } = useAuth();

  // Load calculations models
  const fpaMetrics = calculateFpaTotalMetrics(currentProject.stories, currentProject.classifications, currentProject.ratings);
  const cosmicMetrics = calculateCosmicTotalMetrics(currentProject.stories, currentProject.movements);
  const hybridMetrics = calculateHybridTotalMetrics(currentProject.stories, currentProject.criteria, currentProject.scores, currentProject.overheads);

  // Constants
  const teamSize = currentProject.project?.team_size ?? 5;
  const workDays = currentProject.costConfig?.working_days_per_month ?? 22;

  const fpaProd = currentProject.costConfig?.fpa_productivity_rate ?? 0.75;
  const cosmicProd = currentProject.costConfig?.cosmic_productivity_rate ?? 1.5;
  const hybridProd = currentProject.costConfig?.hybrid_productivity_rate ?? 1.5;

  const overheadsList = currentProject.overheads || [];
  const ohImpacts = calculateOverheadImpacts(overheadsList, fpaMetrics.afp, cosmicMetrics.totalCfp, hybridMetrics.totalHybridFp);

  const fpaTotalPoints = fpaMetrics.afp + ohImpacts.fpaOhPoints;
  const cosmicTotalPoints = cosmicMetrics.totalCfp + ohImpacts.cosmicOhPoints;
  const hybridTotalPoints = hybridMetrics.totalHybridFp + ohImpacts.hybridOhPoints;

  const fpaCost = fpaTotalPoints * (currentProject.costConfig?.fpa_cost_per_point ?? 1875);
  const fpaEffort = Math.round((fpaTotalPoints / fpaProd) * 10) / 10;
  const fpaDuration = teamSize > 0 ? Math.round((fpaEffort / teamSize / workDays) * 10) / 10 : 0;

  const cosmicCost = cosmicTotalPoints * (currentProject.costConfig?.cosmic_cost_per_point ?? 1875);
  const cosmicEffort = Math.round((cosmicTotalPoints / cosmicProd) * 10) / 10;
  const cosmicDuration = teamSize > 0 ? Math.round((cosmicEffort / teamSize / workDays) * 10) / 10 : 0;

  const hybridCost = hybridTotalPoints * (currentProject.costConfig?.hybrid_cost_per_point ?? 1875);
  const hybridEffort = Math.round((hybridTotalPoints / hybridProd) * 10) / 10;
  const hybridDuration = teamSize > 0 ? Math.round((hybridEffort / teamSize / workDays) * 10) / 10 : 0;

  // Maximum benchmark comparison to scale progress charts
  const maxCost = Math.max(fpaCost, cosmicCost, hybridCost, 1);
  const maxEffort = Math.max(fpaEffort, cosmicEffort, hybridEffort, 1);
  const maxDuration = Math.max(fpaDuration, cosmicDuration, hybridDuration, 1);

  // Trigger PDF summary export via jsPDF - Prompt 9 details
  const triggerPdfExport = () => {
    if (!currentProject.project) return;
    const doc = new jsPDF() as any;

    // Header styling
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("SOFTWARE ESTIMATION SUITE SUMMARY REPORT", 14, 20);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated Date: ${new Date().toLocaleString()}`, 14, 26);
    doc.text(`Estimator: ${currentProject.project.estimator_name || 'Umesh S.'}`, 14, 30);
    doc.text(`Client Name: ${currentProject.project.client || 'General'}`, 14, 34);

    // 1. Project info table
    doc.autoTable({
      startY: 40,
      head: [['Dimension Settings', 'Current Value']],
      body: [
        ['Project Proposal Name', currentProject.project.name],
        ['Revision Version', currentProject.project.version],
        ['Core Engineering Structure', currentProject.project.project_type],
        ['Currency Settings', currentProject.project.currency],
        ['Designated Team Size', `${currentProject.project.team_size} pool`],
        ['Assigned Status', currentProject.project.status]
      ],
      theme: 'grid',
      headStyles: { fillColor: [13, 148, 136] }
    });

    // 2. Comparison Metrics Table
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Estimation Framework Method', 'Size Value', 'Estimated Cost', 'Estimated Effort', 'Est Duration']],
      body: [
        ['FPA (Function Point Analysis)', `${fpaTotalPoints.toFixed(1)} Adjusted AFP`, fpaCost.toLocaleString('en-US', { style: 'currency', currency: currentProject.project.currency, maximumFractionDigits: 0 }), `${fpaEffort} person-days`, `${fpaDuration} months`],
        ['COSMIC (ISO/IEC 19761)', `${cosmicTotalPoints.toFixed(1)} Adjusted CFP`, cosmicCost.toLocaleString('en-US', { style: 'currency', currency: currentProject.project.currency, maximumFractionDigits: 0 }), `${cosmicEffort} person-days`, `${cosmicDuration} months`],
        ['Hybrid MCDA (MCDA + Overheads)', `${hybridTotalPoints.toFixed(1)} Adjusted HFP`, hybridCost.toLocaleString('en-US', { style: 'currency', currency: currentProject.project.currency, maximumFractionDigits: 0 }), `${hybridEffort} person-days`, `${hybridDuration} months`]
      ],
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] }
    });

    // 3. User stories logs
    const storiesBody = currentProject.stories.map((s, idx) => [
      s.story_id,
      s.role,
      `I want to ${s.goal}`,
      s.priority,
      s.ai_status
    ]);
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 10,
      head: [['ID Key', 'Domain/Actor', 'Objective Goal', 'Priority Value', 'AI Status']],
      body: storiesBody,
      theme: 'grid',
      headStyles: { fillColor: [51, 65, 85] }
    });

    doc.save(`Estimation_Summary_${currentProject.project.id}_Report.pdf`);
  };

  // Trigger spreadsheet XLSX multi-tab workbook - Prompt 9 details
  const triggerExcelExport = () => {
    if (!currentProject.project) return;
    const wb = XLSX.utils.book_new();

    // Tab 1: Project Metadata
    const projectSheetData = [
      ['Dimension Header', 'Field Value'],
      ['Proposal Name', currentProject.project.name],
      ['Client', currentProject.project.client || 'General'],
      ['Version Identifier', currentProject.project.version],
      ['Engineering Category', currentProject.project.project_type],
      ['Status', currentProject.project.status],
      ['Currency Name', currentProject.project.currency],
      ['Team Allocation pool', currentProject.project.team_size],
      ['Date updated', currentProject.project.updated_at]
    ];
    const wsProject = XLSX.utils.aoa_to_sheet(projectSheetData);
    XLSX.utils.book_append_sheet(wb, wsProject, 'Project Profile');

    // Tab 2: User story inventories
    const storiesHeaders = [['Story ID', 'Actor/Domain', 'Goal Description', 'Benefit', 'Epic', 'Priority Value', 'Source Type', 'AI Status']];
    const storiesRows = currentProject.stories.map(s => [
      s.story_id,
      s.role,
      s.goal,
      s.benefit,
      s.epic,
      s.priority,
      s.source,
      s.ai_status
    ]);
    const wsStories = XLSX.utils.aoa_to_sheet([...storiesHeaders, ...storiesRows]);
    XLSX.utils.book_append_sheet(wb, wsStories, 'Staged User Stories');

    // Tab 3: Model metrics comparison log
    const compareData = [
      ['Estimation Model', 'Calculated Size Units', 'Base Cost Point Price', 'Calculated Total Price', 'Calculated Effort Days', 'Calculated Schedule months'],
      ['Function Points (FPA)', `${fpaTotalPoints.toFixed(1)} AFP`, currentProject.costConfig?.fpa_cost_per_point || 1875, fpaCost, fpaEffort, fpaDuration],
      ['COSMIC metric ISO', `${cosmicTotalPoints.toFixed(1)} CFP`, currentProject.costConfig?.cosmic_cost_per_point || 1875, cosmicCost, cosmicEffort, cosmicDuration],
      ['Hybrid MCDA + Overheads', `${hybridTotalPoints.toFixed(1)} HFP`, currentProject.costConfig?.hybrid_cost_per_point || 1875, hybridCost, hybridEffort, hybridDuration]
    ];
    const wsCompare = XLSX.utils.aoa_to_sheet(compareData);
    XLSX.utils.book_append_sheet(wb, wsCompare, 'Model Comparisons');

    XLSX.writeFile(wb, `Structured_Consolidated_Estimations_${currentProject.project.id}.xlsx`);
  };

  if (!currentProject.project) {
    return (
      <div className="max-w-2xl mx-auto p-8 my-10 bg-white border border-slate-200 rounded-xl shadow-xs text-center select-none animate-fade-in font-sans">
        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-500 border border-amber-100 animate-pulse">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h3 className="font-sans font-bold text-lg text-slate-800 mb-2">Select a Proposal</h3>
        <p className="font-sans text-xs text-slate-500 max-w-sm mx-auto mb-6 leading-relaxed">
          Please select an active project proposal first from the <strong className="text-slate-700">Project proposals</strong> main menu tab to view consolidated metrics, comparison reports, and PDF downloads.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">

      {/* Dynamic Exports and actions panel */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-4 gap-4">
        <div>
          <h2 className="font-sans font-extrabold text-lg text-slate-800 tracking-tight">Consolidated Comparative Dashboard</h2>
          <p className="font-sans text-xs text-slate-400">Review parallel sizing metrics across FPA, COSMIC, and MCDA and trigger structured reports documents.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="export-pdf-dashboard-btn"
            onClick={triggerPdfExport}
            className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs py-2 px-4.5 rounded-lg shadow-sm transition cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>Generate PDF Summary Invoices</span>
          </button>

          <button
            id="export-xlsx-dashboard-btn"
            onClick={triggerExcelExport}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs py-2 px-4.5 rounded-lg shadow-sm transition cursor-pointer"
          >
            <FileDown className="w-4 h-4" />
            <span>Excel Consolidated Workbook</span>
          </button>
        </div>
      </div>

      {/* Side by side CSS/HTML dynamic bar charts container (FPA vs COSMIC vs Hybrid comparison) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Cost Budgets Chart card */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-3">
              <SaudiRiyalIcon className="w-5 h-5 text-emerald-600" />
              <span className="font-sans font-extrabold text-xs text-slate-700">Financial Budgets comparative</span>
            </div>

            <div className="divide-y divide-slate-100">
              {/* FPA */}
              <div className="flex justify-between items-center py-2.5 transition hover:bg-slate-50/50 px-1.5 rounded-lg">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0 shadow-sm" />
                  <span className="font-semibold text-slate-600 text-xs">IFPUG FPA</span>
                </div>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {fpaCost.toLocaleString('en-US', { style: 'currency', currency: currentProject.project?.currency || 'SAR', maximumFractionDigits: 0 })}
                </span>
              </div>

              {/* COSMIC */}
              <div className="flex justify-between items-center py-2.5 transition hover:bg-slate-50/50 px-1.5 rounded-lg">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0 shadow-sm" />
                  <span className="font-semibold text-slate-650 text-xs">COSMIC Size</span>
                </div>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {cosmicCost.toLocaleString('en-US', { style: 'currency', currency: currentProject.project?.currency || 'SAR', maximumFractionDigits: 0 })}
                </span>
              </div>

              {/* Hybrid MCDA */}
              <div className="flex justify-between items-center py-2.5 transition hover:bg-slate-50/50 px-1.5 rounded-lg">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-500 shrink-0 shadow-sm" />
                  <span className="font-semibold text-slate-650 text-xs">Hybrid Size</span>
                </div>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {hybridCost.toLocaleString('en-US', { style: 'currency', currency: currentProject.project?.currency || 'SAR', maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Effort comparison chart */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-3">
              <Briefcase className="w-4.5 h-4.5 text-amber-500" />
              <span className="font-sans font-extrabold text-xs text-slate-700">Engineering Effort Comparative</span>
            </div>

            <div className="divide-y divide-slate-100">
              {/* FPA Effort */}
              <div className="flex justify-between items-center py-2.5 transition hover:bg-slate-50/50 px-1.5 rounded-lg">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0 shadow-sm" />
                  <span className="font-semibold text-slate-600 text-xs">IFPUG FPA</span>
                </div>
                <span className="font-mono font-bold text-slate-900 text-sm">{fpaEffort} person-days</span>
              </div>

              {/* COSMIC Effort */}
              <div className="flex justify-between items-center py-2.5 transition hover:bg-slate-50/50 px-1.5 rounded-lg">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" />
                  <span className="font-semibold text-slate-650 text-xs">COSMIC Size</span>
                </div>
                <span className="font-mono font-bold text-slate-900 text-sm">{cosmicEffort} person-days</span>
              </div>

              {/* Hybrid MCDA Effort */}
              <div className="flex justify-between items-center py-2.5 transition hover:bg-slate-50/50 px-1.5 rounded-lg">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-500 shrink-0 shadow-sm" />
                  <span className="font-semibold text-slate-650 text-xs">Hybrid Size</span>
                </div>
                <span className="font-mono font-bold text-slate-900 text-sm">{hybridEffort} person-days</span>
              </div>
            </div>
          </div>
        </div>

        {/* Schedule Durations Comparative */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-3">
              <Calendar className="w-4.5 h-4.5 text-rose-500" />
              <span className="font-sans font-extrabold text-xs text-slate-700">Project Duration Timelines</span>
            </div>

            <div className="divide-y divide-slate-100">
              {/* FPA Duration */}
              <div className="flex justify-between items-center py-2.5 transition hover:bg-slate-50/50 px-1.5 rounded-lg">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0 shadow-sm" />
                  <span className="font-semibold text-slate-600 text-xs">IFPUG FPA</span>
                </div>
                <span className="font-mono font-bold text-slate-900 text-sm">{fpaDuration} months</span>
              </div>

              {/* COSMIC Duration */}
              <div className="flex justify-between items-center py-2.5 transition hover:bg-slate-50/50 px-1.5 rounded-lg">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0 shadow-sm" />
                  <span className="font-semibold text-slate-650 text-xs">COSMIC Size</span>
                </div>
                <span className="font-mono font-bold text-slate-900 text-sm">{cosmicDuration} months</span>
              </div>

              {/* Hybrid MCDA Duration */}
              <div className="flex justify-between items-center py-2.5 transition hover:bg-slate-50/50 px-1.5 rounded-lg">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-500 shrink-0 shadow-sm" />
                  <span className="font-semibold text-slate-650 text-xs">Hybrid Size</span>
                </div>
                <span className="font-mono font-bold text-slate-900 text-sm">{hybridDuration} months</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Structured metrics list log grids */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
          <TableProperties className="w-4.5 h-4.5 text-slate-650" />
          <span className="font-sans font-extrabold text-xs text-slate-700">Framework Model comparative Matrix Summary</span>
        </div>
        <div className="p-4 overflow-x-auto">
          <table className="w-full text-xs text-slate-650 text-left">
            <thead>
              <tr className="border-b border-slate-100 font-mono text-[9px] uppercase text-slate-500 bg-slate-50/50">
                <th className="py-2.5 px-3">Estimation Method Framework</th>
                <th className="py-2.5 px-3">Calculated Size Indexes</th>
                <th className="py-2.5 px-3">Point Price Rate</th>
                <th className="py-2.5 px-3">Calculated Cost Base</th>
                <th className="py-2.5 px-3">Effort (Person-Days)</th>
                <th className="py-2.5 px-3">Schedule Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              <tr>
                <td className="py-3 px-3 font-bold text-slate-800 font-sans">IFPUG Function Points (FPA)</td>
                <td className="py-3 px-3 font-mono font-bold text-indigo-750">{fpaTotalPoints.toFixed(1)} Adjusted AFP</td>
                <td className="py-3 px-3">
                  {(currentProject.costConfig?.fpa_cost_per_point || 1875).toLocaleString('en-US', { style: 'currency', currency: currentProject.project?.currency || 'SAR', maximumFractionDigits: 0 })}
                </td>
                <td className="py-3 px-3 font-bold text-slate-900">
                  {fpaCost.toLocaleString('en-US', { style: 'currency', currency: currentProject.project?.currency || 'SAR', maximumFractionDigits: 0 })}
                </td>
                <td className="py-3 px-3 font-mono">{fpaEffort} person-days</td>
                <td className="py-3 px-3 font-mono text-indigo-600 font-bold">{fpaDuration} months</td>
              </tr>

              <tr>
                <td className="py-3 px-3 font-bold text-slate-800 font-sans">COSMIC Points ISO 19761</td>
                <td className="py-3 px-3 font-mono font-bold text-teal-750">{cosmicTotalPoints.toFixed(1)} Adjusted CFP</td>
                <td className="py-3 px-3">
                  {(currentProject.costConfig?.cosmic_cost_per_point || 1875).toLocaleString('en-US', { style: 'currency', currency: currentProject.project?.currency || 'SAR', maximumFractionDigits: 0 })}
                </td>
                <td className="py-3 px-3 font-bold text-slate-900">
                  {cosmicCost.toLocaleString('en-US', { style: 'currency', currency: currentProject.project?.currency || 'SAR', maximumFractionDigits: 0 })}
                </td>
                <td className="py-3 px-3 font-mono">{cosmicEffort} person-days</td>
                <td className="py-3 px-3 font-mono text-indigo-600 font-bold">{cosmicDuration} months</td>
              </tr>

              <tr className="bg-slate-50/50">
                <td className="py-3 px-3 font-bold text-slate-800 font-sans">Hybrid MCDA Framework</td>
                <td className="py-3 px-3 font-mono font-bold text-violet-750">{hybridTotalPoints.toFixed(1)} Adjusted HFP</td>
                <td className="py-3 px-3">
                  {(currentProject.costConfig?.hybrid_cost_per_point || 1875).toLocaleString('en-US', { style: 'currency', currency: currentProject.project?.currency || 'SAR', maximumFractionDigits: 0 })}
                </td>
                <td className="py-3 px-3 font-bold text-emerald-705">
                  {hybridCost.toLocaleString('en-US', { style: 'currency', currency: currentProject.project?.currency || 'SAR', maximumFractionDigits: 0 })}
                </td>
                <td className="py-3 px-3 font-mono">{hybridEffort} person-days</td>
                <td className="py-3 px-3 font-mono text-indigo-600 font-bold">{hybridDuration} months</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
