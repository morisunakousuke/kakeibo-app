import { supabase, formatNum } from './common.js';

const showBtn = document.getElementById('showBtn');
const prevYearBtn = document.getElementById('prevYearBtn');
const nextYearBtn = document.getElementById('nextYearBtn');
const yearSelect = document.getElementById('yearSelect');
const summaryBox = document.getElementById('summaryBox');
const tableBody = document.querySelector('#yearlyTable tbody');
const chartContainer = document.getElementById('chartContainer');
let chart = null;

// 初期表示
document.addEventListener('DOMContentLoaded', () => {
  const currentYear = new Date().getFullYear();
  yearSelect.value = currentYear;
  loadYearlyData();
});

showBtn.addEventListener('click', loadYearlyData);
prevYearBtn.addEventListener('click', () => {
  yearSelect.value = Number(yearSelect.value) - 1;
  loadYearlyData();
});
nextYearBtn.addEventListener('click', () => {
  yearSelect.value = Number(yearSelect.value) + 1;
  loadYearlyData();
});

// === データ取得 ===
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
      chartContainer.innerHTML = '';
      return;
    }

    renderSummary(data);
    renderTable(data);
    renderChartOne(data, year);

  } catch (err) {
    console.error('データ取得エラー:', err);
  }
}

// === 年間サマリー ===
function renderSummary(data) {
  const totalIncome = data.reduce((s, d) => s + (d.income || 0), 0);
  const totalExpense = data.reduce(
    (s, d) =>
      s +
      (d.meal || 0) +
      (d.supplies || 0) +
      (d.play || 0) +
      (d.infra || 0) +
      (d.education || 0) +
      (d.others || 0),
    0
  );
  const balance = totalIncome - totalExpense;

  summaryBox.innerHTML = `
    <div class="summary-text">
      <div>年間収入合計：${formatNum(totalIncome)}円</div>
      <div>年間支出合計：${formatNum(totalExpense)}円</div>
      <div>年間収支：<span class="${balance >= 0 ? 'positive' : 'negative'}">${formatNum(balance)}円</span></div>
    </div>
  `;
}

// === 表の作成 ===
function renderTable(data) {
  const monthly = {};
  for (let i = 1; i <= 12; i++) {
    monthly[i] = {
      income: 0,
      meal: 0,
      supplies: 0,
      play: 0,
      infra: 0,
      education: 0,
      others: 0
    };
  }

  data.forEach((row) => {
    const m = new Date(row.date).getMonth() + 1;
    monthly[m].income += row.income || 0;
    monthly[m].meal += row.meal || 0;
    monthly[m].supplies += row.supplies || 0;
    monthly[m].play += row.play || 0;
    monthly[m].infra += row.infra || 0;
    monthly[m].education += row.education || 0;
    monthly[m].others += row.others || 0;
  });

  tableBody.innerHTML = '';
  let total = {
    income: 0,
    meal: 0,
    supplies: 0,
    play: 0,
    infra: 0,
    education: 0,
    others: 0,
    expense: 0,
    balance: 0
  };

  Object.entries(monthly).forEach(([month, val]) => {
    const expense =
      val.meal + val.supplies + val.play + val.infra + val.education + val.others;
    const balance = val.income - expense;

    // 累計
    total.income += val.income;
    total.meal += val.meal;
    total.supplies += val.supplies;
    total.play += val.play;
    total.infra += val.infra;
    total.education += val.education;
    total.others += val.others;
    total.expense += expense;
    total.balance += balance;

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
      <td>${formatNum(expense)}</td>
      <td class="${balance >= 0 ? 'positive' : 'negative'}">${formatNum(balance)}</td>
    `;
    tableBody.appendChild(row);
  });

  // 平均値算出
  const avg = {};
  Object.keys(total).forEach((k) => (avg[k] = Math.round(total[k] / 12)));

  // === 合計行 ===
  const totalRow = document.createElement('tr');
  totalRow.style.backgroundColor = '#fffde7';
  totalRow.innerHTML = `
    <th>合計</th>
    <th>${formatNum(total.income)}</th>
    <th>${formatNum(total.meal)}</th>
    <th>${formatNum(total.supplies)}</th>
    <th>${formatNum(total.play)}</th>
    <th>${formatNum(total.infra)}</th>
    <th>${formatNum(total.education)}</th>
    <th>${formatNum(total.others)}</th>
    <th>${formatNum(total.expense)}</th>
    <th class="${total.balance >= 0 ? 'positive' : 'negative'}">${formatNum(total.balance)}</th>
  `;
  tableBody.appendChild(totalRow);

  // === 平均行 ===
  const avgRow = document.createElement('tr');
  avgRow.style.backgroundColor = '#e3f2fd';
  avgRow.innerHTML = `
    <th>平均</th>
    <th>${formatNum(avg.income)}</th>
    <th>${formatNum(avg.meal)}</th>
    <th>${formatNum(avg.supplies)}</th>
    <th>${formatNum(avg.play)}</th>
    <th>${formatNum(avg.infra)}</th>
    <th>${formatNum(avg.education)}</th>
    <th>${formatNum(avg.others)}</th>
    <th>${formatNum(avg.expense)}</th>
    <th class="${avg.balance >= 0 ? 'positive' : 'negative'}">${formatNum(avg.balance)}</th>
  `;
  tableBody.appendChild(avgRow);
}


// === 生活費合計表と同デザインの折れ線グラフ（収入＋支出 1グラフ） ===
function renderChartOne(data, year) {
  chartContainer.innerHTML = '';

  // カードブロック1つだけ
  const block = document.createElement('div');
  block.className = 'chart-block';
  block.innerHTML = `
    <h3>${year}年 月別収入・支出推移</h3>
    <canvas id="yearlyChart"></canvas>
  `;
  chartContainer.appendChild(block);

  const monthly = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    income: 0,
    expense: 0
  }));

  data.forEach((row) => {
    const m = new Date(row.date).getMonth();
    monthly[m].income += row.income || 0;
    monthly[m].expense +=
      (row.meal || 0) +
      (row.supplies || 0) +
      (row.play || 0) +
      (row.infra || 0) +
      (row.education || 0) +
      (row.others || 0);
  });

  const ctx = document.getElementById('yearlyChart').getContext('2d');

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: monthly.map((m) => `${m.month}月`),
      datasets: [
        {
          label: '収入',
          data: monthly.map((m) => m.income),
          borderColor: 'rgba(67,160,71,0.9)',
          backgroundColor: 'rgba(67,160,71,0.2)',
          fill: true,
          tension: 0.2,
          borderWidth: 2,
          pointRadius: 3
        },
        {
          label: '支出',
          data: monthly.map((m) => m.expense),
          borderColor: 'rgba(229,57,53,0.9)',
          backgroundColor: 'rgba(229,57,53,0.2)',
          fill: true,
          tension: 0.2,
          borderWidth: 2,
          pointRadius: 3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      aspectRatio: 2,
      plugins: {
        legend: { position: 'top' },
        title: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (v) => v.toLocaleString() + '円'
          }
        }
      }
    }
  });
}
