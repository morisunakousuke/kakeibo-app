import { supabase } from './common.js';

const showBtn = document.getElementById('showBtn');
const tableContainer = document.getElementById('tableContainer');
const chartTotalCanvas = document.getElementById('chartTotal');
const chartAvgCanvas = document.getElementById('chartAverage');
let chartTotal, chartAvg;

showBtn.addEventListener('click', async () => {
  const fromYear = parseInt(document.getElementById('fromYear').value);
  const toYear = parseInt(document.getElementById('toYear').value);

  if (isNaN(fromYear) || isNaN(toYear) || fromYear > toYear) {
    alert("正しい年の範囲を指定してください。");
    return;
  }

  tableContainer.innerHTML = "<p>読み込み中...</p>";

  const { data, error } = await supabase.from("total_expenditure").select("*");
  if (error) {
    console.error("Supabaseエラー:", error);
    tableContainer.innerHTML = "<p style='color:red;'>データ取得に失敗しました。</p>";
    return;
  }

  // 年ごとに分類
  const yearMap = {};
  for (const row of data) {
    const year = parseInt(row.year_month.slice(0, 4));
    if (year < fromYear || year > toYear) continue;
    if (!yearMap[year]) yearMap[year] = [];
    yearMap[year].push(row);
  }

  const years = Object.keys(yearMap).sort();
  const tbodyHTML = [];

  // グラフ用データセット
  const items = ["meal", "supplies", "play", "infra", "education", "others"];
  const itemNames = ["食事関係", "生活用品系", "遊び・娯楽", "生活費関係", "子供・教育", "その他"];
  const colors = ["#4caf50", "#2196f3", "#ff9800", "#9c27b0", "#f44336", "#795548"];

  const totalDatasets = [];
  const avgDatasets = [];

  // 各項目に対してデータ系列生成
  items.forEach((key, idx) => {
    totalDatasets.push({ label: itemNames[idx], data: [], borderColor: colors[idx], backgroundColor: colors[idx]+"20", fill: false, tension: 0.2 });
    avgDatasets.push({ label: itemNames[idx], data: [], borderColor: colors[idx], backgroundColor: colors[idx]+"20", fill: false, tension: 0.2, borderDash: [4,3] });
  });

  // 表データ作成
  const table = document.createElement("table");
  table.classList.add("data-table");
  table.innerHTML = `
    <thead>
      <tr>
        <th>年</th>
        <th>食事関係</th>
        <th>生活用品系</th>
        <th>遊び・娯楽関係</th>
        <th>生活費関係</th>
        <th>子供・教育</th>
        <th>その他</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const tbody = table.querySelector("tbody");

  years.forEach(year => {
    const rows = yearMap[year];
    const months = rows.length || 1;
    const sum = f => rows.reduce((a, r) => a + (r[`${f}_total`] || 0), 0);
    const avg = f => Math.round(sum(f) / months);

    const totals = items.map(sum);
    const avgs = items.map(avg);

    // 表
    tbody.innerHTML += `
      <tr>
        <td>${year} 合計</td>
        ${totals.map(v => `<td>${fmt(v)}</td>`).join("")}
      </tr>
      <tr>
        <td>${year} 平均</td>
        ${avgs.map(v => `<td>${fmt(v)}</td>`).join("")}
      </tr>
    `;

    // グラフ
    totals.forEach((v, i) => totalDatasets[i].data.push(v));
    avgs.forEach((v, i) => avgDatasets[i].data.push(v));
  });

  tableContainer.innerHTML = "";
  tableContainer.appendChild(table);

  // グラフ描画
  if (chartTotal) chartTotal.destroy();
  if (chartAvg) chartAvg.destroy();

  chartTotal = new Chart(chartTotalCanvas, {
    type: "line",
    data: { labels: years, datasets: totalDatasets },
    options: baseChartOption("年別 各項目 合計"),
    plugins: [ChartDataLabels]
  });

  chartAvg = new Chart(chartAvgCanvas, {
    type: "line",
    data: { labels: years, datasets: avgDatasets },
    options: baseChartOption("年別 各項目 平均"),
    plugins: [ChartDataLabels]
  });
});

function baseChartOption(title) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom" },
      title: { display: true, text: title, font: { size: 16 } },
      datalabels: {
        align: "top",
        font: { size: 10, weight: "bold" },
        formatter: val => val ? val.toLocaleString() : ""
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: val => val.toLocaleString() + "円"
        }
      }
    }
  };
}

function fmt(num) {
  if (!num) return "";
  return Math.round(num).toLocaleString();
}
