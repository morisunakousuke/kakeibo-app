import { supabase } from './common.js';

if (typeof Chart !== 'undefined' && typeof ChartDataLabels !== 'undefined') {
  Chart.register(ChartDataLabels);
}

let chartInstance = {};

function formatYM(ym) {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  return `${Number(m)}月`;
}

async function fetchFixedCosts(year) {
  const { data, error } = await supabase
    .from('fixed_costs_summary')
    .select('*')
    .ilike('year_month', `${year}-%`)
    .order('year_month', { ascending: true });

  if (error) throw error;
  return data || [];
}

// === 表の描画 ===
function renderTable(data) {
  const tbody = document.querySelector('#fixedTable tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  let totalYear = 0;

  data.forEach(row => {
    const month = row.year_month.split('-')[1].replace(/^0/, '') + '月';
    const monthTotal =
      (row.electricity ?? 0) +
      (row.gas ?? 0) +
      (row.water ?? 0) +
      (row.internet ?? 0) +
      (row.mortgage ?? 0);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${month}</td>
      <td>${row.electricity?.toLocaleString() || 0}</td>
      <td>${row.gas?.toLocaleString() || 0}</td>
      <td>${row.water?.toLocaleString() || 0}</td>
      <td>${row.internet?.toLocaleString() || 0}</td>
      <td>${row.mortgage?.toLocaleString() || 0}</td>
      <td><strong>${monthTotal.toLocaleString()}</strong></td>
    `;
    tbody.appendChild(tr);
    totalYear += monthTotal;
  });

  const summaryBox = document.getElementById('summaryBox');
  summaryBox.innerHTML = `<span>年間生活費合計: ${totalYear.toLocaleString()}円</span>`;
}

// === グラフ描画 ===
function createChart(canvasId, label, dataArr, labels, color, year) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  if (chartInstance[canvasId]) chartInstance[canvasId].destroy();

  const safeData = dataArr.map(v => (v == null ? 0 : v));

  chartInstance[canvasId] = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: `${label} (${year}年)`,
          data: safeData,
          borderColor: color,
          backgroundColor: color + '33',
          fill: true,
          tension: 0.3,
          pointRadius: 3,
        },
      ],
    },
    options: {
      responsive: false,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        datalabels: {
          align: 'top',
          font: { size: 10, weight: 'bold' },
          formatter: v => (v ? v.toLocaleString() : ''),
        },
      },
      scales: {
        y: { beginAtZero: true },
      },
    },
  });
}

async function renderFixedCostCharts(year) {
  const data = await fetchFixedCosts(year);
  if (!data || data.length === 0) {
    console.warn('データが存在しません');
    return;
  }

  const labels = data.map(r => formatYM(r.year_month));
  Object.values(chartInstance).forEach(c => c.destroy());
  chartInstance = {};

  createChart('chartElectric', '電気代', data.map(r => r.electricity), labels, '#ffb74d', year);
  createChart('chartGas', 'ガス代', data.map(r => r.gas), labels, '#ef5350', year);
  createChart('chartWater', '水道代', data.map(r => r.water), labels, '#42a5f5', year);
  createChart('chartInternet', 'ネット代', data.map(r => r.internet), labels, '#26a69a', year);
  createChart('chartMortgage', '住宅ローン', data.map(r => r.mortgage), labels, '#8d6e63', year);

  renderTable(data); // ← 表も描画
}

document.addEventListener('DOMContentLoaded', async () => {
  const now = new Date();
  const thisYear = now.getFullYear();
  document.getElementById('yearSelect').value = thisYear;
  await renderFixedCostCharts(thisYear);
});

document.getElementById('showBtn').addEventListener('click', async () => {
  const year = document.getElementById('yearSelect').value;
  await renderFixedCostCharts(year);
});

function clampYear(v) {
  const n = Number(v) || new Date().getFullYear();
  return Math.min(2100, Math.max(2000, n));
}

async function shiftYear(delta) {
  const input = document.getElementById('yearSelect');
  input.value = clampYear((Number(input.value) || new Date().getFullYear()) + delta);
  await renderFixedCostCharts(input.value);
}

document.getElementById('prevYearBtn').addEventListener('click', () => shiftYear(-1));
document.getElementById('nextYearBtn').addEventListener('click', () => shiftYear(1));

// （お好みで）年入力の変更だけでも即反映したい場合
document.getElementById('yearSelect').addEventListener('change', async (e) => {
  e.target.value = clampYear(e.target.value);
  await renderFixedCostCharts(e.target.value);
});