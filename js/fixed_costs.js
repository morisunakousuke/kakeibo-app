import { supabase, formatNum } from './common.js';

const showBtn = document.getElementById('showBtn');
const prevYearBtn = document.getElementById('prevYearBtn');
const nextYearBtn = document.getElementById('nextYearBtn');
const yearSelect = document.getElementById('yearSelect');
const tableBody = document.querySelector('#fixedTable tbody');
const summaryBox = document.getElementById('summaryBox');
const chartContainer = document.getElementById('chartContainer');

// ★ 配列ではなく「キー付きオブジェクト」にするほうが自然
let charts = {};

showBtn.addEventListener('click', loadFixedCosts);
prevYearBtn.addEventListener('click', () => {
  yearSelect.value = Number(yearSelect.value) - 1;
  showBtn.click();
});
nextYearBtn.addEventListener('click', () => {
  yearSelect.value = Number(yearSelect.value) + 1;
  showBtn.click();
});

async function loadFixedCosts() {
  const year = yearSelect.value;
  if (!year) {
    alert('年を入力してください');
    return;
  }

  tableBody.innerHTML = '<tr><td colspan="8">読み込み中...</td></tr>';
  summaryBox.innerHTML = '';

  // ❌ ここが原因だった：canvas ごと消してしまう
  // chartContainer.innerHTML = '';

  // 既存チャート破棄（Chart.js のインスタンスだけきれいに消す）
  Object.values(charts).forEach(ch => {
    try {
      ch.destroy();
    } catch (e) {
      console.warn('chart destroy error', e);
    }
  });
  charts = {};

  try {
    const { data, error } = await supabase
      .from('fixed_costs_summary')
      .select('*')
      .ilike('year_month', `${year}-%`)
      .order('year_month', { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="8">データがありません</td></tr>';
      return;
    }

    renderTable(data, year);
    renderCharts(data, year);

  } catch (err) {
    console.error('データ取得エラー:', err);
    tableBody.innerHTML = '<tr><td colspan="8" style="color:red;">取得に失敗しました</td></tr>';
  }
}

function renderTable(data, year) {
  tableBody.innerHTML = '';

  data.forEach(row => {
    const ym = row.year_month.replace('-', '年') + '月';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="text-align:center">${ym}</td>
      <td>${formatNum(row.electricity)}</td>
      <td>${formatNum(row.gas)}</td>
      <td>${formatNum(row.water)}</td>
      <td>${formatNum(row.internet)}</td>
      <td>${formatNum(row.mortgage)}</td>
      <td>${formatNum(row.total)}</td>
    `;
    tableBody.appendChild(tr);
  });

  // 合計・平均
  const sums = {
    electricity: data.reduce((s, r) => s + (r.electricity || 0), 0),
    gas: data.reduce((s, r) => s + (r.gas || 0), 0),
    water: data.reduce((s, r) => s + (r.water || 0), 0),
    internet: data.reduce((s, r) => s + (r.internet || 0), 0),
    mortgage: data.reduce((s, r) => s + (r.mortgage || 0), 0),
    total: data.reduce((s, r) => s + (r.total || 0), 0)
  };
  const months = data.length;
  const avgs = Object.fromEntries(
    Object.entries(sums).map(([k, v]) => [k, v / months])
  );

  const totalRow = document.createElement('tr');
  totalRow.style.backgroundColor = '#f0f8ff';
  totalRow.innerHTML = `
    <td style="font-weight:bold;">合計</td>
    <td>${formatNum(sums.electricity)}</td>
    <td>${formatNum(sums.gas)}</td>
    <td>${formatNum(sums.water)}</td>
    <td>${formatNum(sums.internet)}</td>
    <td>${formatNum(sums.mortgage)}</td>
    <td>${formatNum(sums.total)}</td>
  `;
  tableBody.appendChild(totalRow);

  const avgRow = document.createElement('tr');
  avgRow.style.backgroundColor = '#f9fff5';
  avgRow.innerHTML = `
    <td style="font-weight:bold;">平均</td>
    <td>${formatNum(Math.round(avgs.electricity))}</td>
    <td>${formatNum(Math.round(avgs.gas))}</td>
    <td>${formatNum(Math.round(avgs.water))}</td>
    <td>${formatNum(Math.round(avgs.internet))}</td>
    <td>${formatNum(Math.round(avgs.mortgage))}</td>
    <td>${formatNum(Math.round(avgs.total))}</td>
  `;
  tableBody.appendChild(avgRow);

  summaryBox.innerHTML = `
    <div style="margin-top:15px; font-weight:bold; font-size:16px;">
      年間生活費合計：${formatNum(sums.total)}円　
      年間生活費平均（月あたり）：${formatNum(Math.round(avgs.total))}円
    </div>
  `;
}

function renderCharts(data, year) {
  const labels = data.map(r => r.year_month.split('-')[1] + '月');

  const items = [
    { label: '電気代', key: 'electricity', color: 'rgba(255,99,132,0.9)' },
    { label: 'ガス代', key: 'gas', color: 'rgba(255,159,64,0.9)' },
    { label: '水道代', key: 'water', color: 'rgba(54,162,235,0.9)' },
    { label: 'ネット代', key: 'internet', color: 'rgba(75,192,192,0.9)' },
    { label: '住宅ローン', key: 'mortgage', color: 'rgba(153,102,255,0.9)' }
  ];

  items.forEach(({ label, key, color }) => {
    const canvasId = `chart${capitalize(key)}`;
    const canvas = document.getElementById(canvasId);

    if (!canvas) {
      console.warn(`canvas が見つかりません: ${canvasId}`);
      return;
    }

    const ctx = canvas.getContext('2d');

    // 既存グラフ削除
    if (charts[key]) {
      try {
        charts[key].destroy();
      } catch (e) {
        console.warn('chart destroy error', e);
      }
    }

    charts[key] = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label,
          data: data.map(r => r[key]),
          borderColor: color,
          backgroundColor: color.replace('0.9', '0.2'),
          fill: true,
          tension: 0.2,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false, // 高さの自動拡張を防ぐ
        aspectRatio: 2,             // 幅:高さ = 2:1
        layout: {
          padding: { top: 10, bottom: 10 }
        },
        plugins: {
          title: {
            display: true,
            text: `${year}年 ${label} の推移`,
            font: { size: 16 }
          },
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: val => val.toLocaleString() + '円'
            }
          }
        }
      }
    });
  });
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// 初期表示：ページ読み込み完了後に自動表示
document.addEventListener('DOMContentLoaded', loadFixedCosts);
