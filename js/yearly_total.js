import { supabase } from './common.js';

const showBtn = document.getElementById('showBtn');
const prevYearBtn = document.getElementById('prevYearBtn');
const nextYearBtn = document.getElementById('nextYearBtn');
const yearSelect = document.getElementById('yearSelect');
const tableContainer = document.getElementById('tableContainer');
const chartCanvas = document.getElementById('yearlyChart');
const summaryBox = document.getElementById('summaryBox');
let chartInstance = null;

// 🔁 前年・翌年ボタン
prevYearBtn.addEventListener('click', () => {
  yearSelect.value = Number(yearSelect.value) - 1;
  showBtn.click();
});
nextYearBtn.addEventListener('click', () => {
  yearSelect.value = Number(yearSelect.value) + 1;
  showBtn.click();
});

// 📊 表示処理
showBtn.addEventListener('click', async () => {
  const year = yearSelect.value;
  if (!year) return alert('年を入力してください。');
  tableContainer.innerHTML = '<p>読み込み中...</p>';

  const { data, error } = await supabase
    .from('total_expenditure')
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
    summaryBox.innerHTML = `<span>年間支出合計: 0円</span><span>年間収支額: 0円</span>`;
    return;
  }

  // ✅ 支出合計計算
  const processed = data.map(row => {
    const expense =
      (row.meal_total || 0) +
      (row.supplies_total || 0) +
      (row.play_total || 0) +
      (row.infra_total || 0) +
      (row.education_total || 0) +
      (row.others_total || 0);
    return { ...row, expense_total: expense };
  });

  // ✅ 年間集計
  const totalIncome = processed.reduce((s, r) => s + (r.income_total || 0), 0);
  const totalExpense = processed.reduce((s, r) => s + (r.expense_total || 0), 0);
  const balance = totalIncome - totalExpense;

  summaryBox.innerHTML = `
    <span>年間支出合計: ${totalExpense.toLocaleString()}円</span>
    <span>年間収支額: <span style="color:${balance < 0 ? '#d32f2f' : '#2e7d32'};">${balance.toLocaleString()}円</span></span>
  `;

  // ✅ テーブル生成
  const table = document.createElement('table');
  table.classList.add('data-table');
  table.innerHTML = `
    <thead>
      <tr>
        <th>年月</th>
        <th>収入</th>
        <th>食事</th>
        <th>生活用品</th>
        <th>遊び</th>
        <th>生活費</th>
        <th>子供</th>
        <th>その他</th>
        <th>収支</th>
      </tr>
    </thead>
    <tbody>
      ${processed.map(r => {
        const bal = (r.income_total || 0) - r.expense_total;
        const ym = formatYM(r.year_month);
        return `
          <tr>
            <td>${ym}</td>
            <td>${fmt(r.income_total)}</td>
            <td>${fmt(r.meal_total)}</td>
            <td>${fmt(r.supplies_total)}</td>
            <td>${fmt(r.play_total)}</td>
            <td>${fmt(r.infra_total)}</td>
            <td>${fmt(r.education_total)}</td>
            <td>${fmt(r.others_total)}</td>
            <td class="${bal < 0 ? 'negative' : 'positive'}">${fmt(bal)}</td>
          </tr>
        `;
      }).join('')}
    </tbody>
  `;
  tableContainer.innerHTML = '';
  tableContainer.appendChild(table);

  // ✅ グラフデータ
  const labels = processed.map(r => formatYM(r.year_month));
  const incomes = processed.map(r => r.income_total);
  const expenses = processed.map(r => r.expense_total);

  if (chartInstance) chartInstance.destroy();

  // ✅ グラフ生成（数値ラベル＋支出のラベル赤色）
  chartInstance = new Chart(chartCanvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: '収入',
          data: incomes,
          borderColor: 'rgba(54, 162, 235, 0.9)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          tension: 0.2,
          borderWidth: 2,
          fill: false
        },
        {
          label: '支出',
          data: expenses,
          borderColor: 'rgba(255, 99, 132, 0.9)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          tension: 0.2,
          borderWidth: 2,
          fill: false
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
          font: { size: 18 }
        },
        legend: { position: 'bottom' },
        datalabels: {
          align: 'top',
          font: { size: 11, weight: 'bold' },
          // ✅ データセットごとに色を変える
          color: (ctx) => {
            const dsLabel = ctx.dataset.label;
            return dsLabel === '支出' ? '#d32f2f' : '#333';
          },
          formatter: (value) => value ? value.toLocaleString() : ''
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (val) => val.toLocaleString() + '円'
          }
        }
      }
    },
    plugins: [ChartDataLabels]
  });
});

function fmt(num) {
  if (num == null || num === 0) return '';
  return num.toLocaleString();
}

function formatYM(ym) {
  const [y, m] = ym.split('-');
  return `${Number(m)}月`;
}
