import { supabase, formatNum } from './common.js';

const showBtn = document.getElementById('showBtn');
const prevYearBtn = document.getElementById('prevYearBtn');
const nextYearBtn = document.getElementById('nextYearBtn');
const yearSelect = document.getElementById('yearSelect');
const summaryBox = document.getElementById('summaryBox');
const tableBody = document.querySelector('#yearlyTable tbody');
let chart = null;

// 初期表示
document.addEventListener('DOMContentLoaded', () => {
  const currentYear = new Date().getFullYear();
  yearSelect.value = currentYear;
  loadYearlyData();
});

// イベント設定
showBtn.addEventListener('click', loadYearlyData);
prevYearBtn.addEventListener('click', () => {
  yearSelect.value = Number(yearSelect.value) - 1;
  loadYearlyData();
});
nextYearBtn.addEventListener('click', () => {
  yearSelect.value = Number(yearSelect.value) + 1;
  loadYearlyData();
});

// データ読込メイン処理
async function loadYearlyData() {
  const year = yearSelect.value;

  try {
    const { data, error } = await supabase
      .from('kakei')
      .select('*')
      .gte('date', `${year}-01-01`)
      .lte('date', `${year}-12-31`)
      .order('date', { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) {
      summaryBox.innerHTML = `<div>データがありません</div>`;
      tableBody.innerHTML = '';
      if (chart) chart.destroy();
      return;
    }

    renderSummary(data, year);
    renderTable(data, year);
    renderChart(data, year);
  } catch (err) {
    console.error('データ取得エラー:', err);
  }
}

// 年間サマリ計算
function renderSummary(data, year) {
  const totalIncome = data.reduce((sum, d) => sum + (d.income || 0), 0);
  const totalExpense = data.reduce((sum, d) => {
    return sum + (d.meal || 0) + (d.supplies || 0) + (d.play || 0) +
           (d.infra || 0) + (d.education || 0) + (d.others || 0);
  }, 0);
  const balance = totalIncome - totalExpense;

  summaryBox.innerHTML = `
    <div>年間収入合計：${formatNum(totalIncome)}円</div>
    <div>年間支出合計：${formatNum(totalExpense)}円</div>
    <div>年間収支：<span class="${balance >= 0 ? 'positive' : 'negative'}">${formatNum(balance)}円</span></div>
  `;
}

// 表レンダリング
function renderTable(data, year) {
  const monthly = {};
  for (let i = 1; i <= 12; i++) {
    monthly[i] = { income: 0, meal: 0, supplies: 0, play: 0, infra: 0, education: 0, others: 0 };
  }

  data.forEach(row => {
    const month = new Date(row.date).getMonth() + 1;
    monthly[month].income += row.income || 0;
    monthly[month].meal += row.meal || 0;
    monthly[month].supplies += row.supplies || 0;
    monthly[month].play += row.play || 0;
    monthly[month].infra += row.infra || 0;
    monthly[month].education += row.education || 0;
    monthly[month].others += row.others || 0;
  });

  tableBody.innerHTML = '';
  let totalIncome = 0, totalExpense = 0;

  Object.entries(monthly).forEach(([month, val]) => {
    const exp = val.meal + val.supplies + val.play + val.infra + val.education + val.others;
    const balance = val.income - exp;

    totalIncome += val.income;
    totalExpense += exp;

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${month}月</td>
      <td>${formatNum(val.income)}</td>
      <td>${formatNum(val.meal)}</td>
      <td>${formatNum(val.supplies)}</td>
      <td>${formatNum(val.play)}</td>
      <td>${formatNum(val.infra)}</td>
      <td>${formatNum(val.education)}</td>
      <td>${formatNum(val.others)}</td>
      <td>${formatNum(exp)}</td>
      <td class="${balance >= 0 ? 'positive' : 'negative'}">${formatNum(balance)}</td>
    `;
    tableBody.appendChild(row);
  });

  // 合計行
  const totalBalance = totalIncome - totalExpense;
  const totalRow = document.createElement('tr');
  totalRow.innerHTML = `
    <th>合計</th>
    <th>${formatNum(totalIncome)}</th>
    <th colspan="6"></th>
    <th>${formatNum(totalExpense)}</th>
    <th class="${totalBalance >= 0 ? 'positive' : 'negative'}">${formatNum(totalBalance)}</th>
  `;
  tableBody.appendChild(totalRow);
}

// 折れ線グラフ描画
function renderChart(data, year) {
  const ctx = document.getElementById('yearlyChart').getContext('2d');
  const monthlyIncome = Array(12).fill(0);
  const monthlyExpense = Array(12).fill(0);

  data.forEach(row => {
    const m = new Date(row.date).getMonth();
    monthlyIncome[m] += row.income || 0;
    monthlyExpense[m] += (row.meal || 0) + (row.supplies || 0) + (row.play || 0) +
                         (row.infra || 0) + (row.education || 0) + (row.others || 0);
  });

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'],
      datasets: [
        {
          label: '収入',
          data: monthlyIncome,
          borderColor: '#43a047',
          backgroundColor: 'rgba(67,160,71,0.2)',
          fill: true,
          tension: 0.3,
          pointRadius: 4
        },
        {
          label: '支出',
          data: monthlyExpense,
          borderColor: '#e53935',
          backgroundColor: 'rgba(229,57,53,0.2)',
          fill: true,
          tension: 0.3,
          pointRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: `${year}年 月別収入・支出推移`,
          font: { size: window.innerWidth < 600 ? 14 : 18 },
          padding: { top: 10, bottom: 15 }
        },
        legend: {
          position: window.innerWidth < 600 ? 'top' : 'bottom',
          labels: {
            boxWidth: 12,
            font: { size: window.innerWidth < 600 ? 11 : 13 }
          }
        },
        datalabels: {
          align: 'top',
          font: { size: window.innerWidth < 600 ? 9 : 11, weight: 'bold' },
          color: ctx => ctx.dataset.label === '支出' ? '#d32f2f' : '#333',
          formatter: value => value ? value.toLocaleString() : ''
        }
      },
      layout: {
        padding: { left: 10, right: 10, top: 20, bottom: 10 }
      },
      scales: {
        x: {
          ticks: {
            font: { size: window.innerWidth < 600 ? 10 : 12 }
          }
        },
        y: {
          beginAtZero: true,
          ticks: {
            callback: val => val.toLocaleString() + '円',
            font: { size: window.innerWidth < 600 ? 10 : 12 }
          }
        }
      }
    },
    plugins: [ChartDataLabels]
  });
}
