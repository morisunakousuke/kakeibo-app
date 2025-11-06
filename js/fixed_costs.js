import { supabase } from './common.js';

const showBtn = document.getElementById('showBtn');
const prevYearBtn = document.getElementById('prevYearBtn');
const nextYearBtn = document.getElementById('nextYearBtn');
const yearSelect = document.getElementById('yearSelect');
const tableContainer = document.getElementById('tableContainer');
const chartCanvas = document.getElementById('fixedCostChart');
const summaryBox = document.getElementById('summaryBox');

let chartInstance = null;

// 🔁 前年・翌年切り替え
prevYearBtn.addEventListener('click', () => {
  yearSelect.value = Number(yearSelect.value) - 1;
  showBtn.click();
});
nextYearBtn.addEventListener('click', () => {
  yearSelect.value = Number(yearSelect.value) + 1;
  showBtn.click();
});

// 📊 表示ボタン押下
showBtn.addEventListener('click', async () => {
  const year = yearSelect.value;
  if (!year) return alert('年を入力してください。');
  tableContainer.innerHTML = '<p>読み込み中...</p>';

  const { data, error } = await supabase
    .from('fixed_costs_summary')
    .select('*')
    .ilike('year_month', `${year}-%`)
    .order('year_month', { ascending: true });

  if (error) {
    console.error('Supabaseエラー:', error);
    tableContainer.innerHTML = '<p style="color:red;">データ取得に失敗しました。</p>';
    return;
  }

  if (!data || data.length === 0) {
    tableContainer.innerHTML = '<p>該当データがありません。</p>';
    if (chartInstance) chartInstance.destroy();
    summaryBox.innerHTML = `<span>年間生活費合計: 0円</span>`;
    return;
  }

  // ✅ 年間合計
  const totalYear = data.reduce((sum, r) => sum + (r.total || 0), 0);
  summaryBox.innerHTML = `<span>年間生活費合計: ${totalYear.toLocaleString()}円</span>`;

  // ✅ テーブル生成
  const table = document.createElement('table');
  table.classList.add('data-table');
  table.innerHTML = `
    <thead>
      <tr>
        <th>年月</th>
        <th>電気代</th>
        <th>ガス代</th>
        <th>水道代</th>
        <th>ネット代</th>
        <th>住宅ローン</th>
        <th>合計</th>
      </tr>
    </thead>
    <tbody>
      ${data.map(r => `
        <tr>
          <td>${formatYM(r.year_month)}</td>
          <td>${fmt(r.electricity)}</td>
          <td>${fmt(r.gas)}</td>
          <td>${fmt(r.water)}</td>
          <td>${fmt(r.internet)}</td>
          <td>${fmt(r.mortgage)}</td>
          <td>${fmt(r.total)}</td>
        </tr>
      `).join('')}
    </tbody>
  `;
  tableContainer.innerHTML = '';
  tableContainer.appendChild(table);

  // ✅ 折れ線グラフ用データ
  const labels = data.map(r => formatYM(r.year_month));
  const datasets = [
    { label: '電気代', data: data.map(r => r.electricity), borderColor: '#ffb74d' },
    { label: 'ガス代', data: data.map(r => r.gas), borderColor: '#ef5350' },
    { label: '水道代', data: data.map(r => r.water), borderColor: '#42a5f5' },
    { label: 'ネット代', data: data.map(r => r.internet), borderColor: '#26a69a' },
    { label: '住宅ローン', data: data.map(r => r.mortgage), borderColor: '#8d6e63' }
  ];

  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(chartCanvas, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: `${year}年 生活費の月別推移`,
          font: { size: 18 }
        },
        legend: { position: 'bottom' },
        datalabels: {
          align: 'top',
          font: { size: 11, weight: 'bold' },
          formatter: (v) => (v ? v.toLocaleString() : '')
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: (val) => val.toLocaleString() + '円' }
        }
      }
    },
    plugins: [ChartDataLabels]
  });
});

// 共通フォーマット関数
function fmt(num) {
  if (num == null || num === 0) return '';
  return num.toLocaleString();
}
function formatYM(ym) {
  const [y, m] = ym.split('-');
  return `${Number(m)}月`;
}
