import { supabase, loadCategories } from './common.js';

const form = document.getElementById('categoryForm');
const message = document.getElementById('message');
const tableBody = document.querySelector('#categoryTable tbody');
const deleteBtn = document.getElementById('deleteBtn');

// カテゴリID採番関数
async function getNextCategoryId(isFixed) {
  const table = isFixed ? 'infra_category' : 'category';
  const { count, error } = await supabase
    .from(table)
    .select('categoryid', { count: 'exact', head: true });
  if (error) throw new Error('ID採番エラー: ' + error.message);

  const nextId = isFixed
    ? '9' + String(count + 1).padStart(2, '0')
    : String(count + 1).padStart(3, '0');
  return nextId;
}

// カテゴリ一覧描画
async function renderTable(isFixed) {
  try {
    const data = await loadCategories(isFixed);
    tableBody.innerHTML = '';
    data.forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><input type="checkbox" value="${row.categoryid}"></td>
        <td>${row.categoryid}</td>
        <td>${row.categoryname}</td>
      `;
      tableBody.appendChild(tr);
    });
  } catch (err) {
    message.textContent = err.message;
  }
}

// トグルボタンの選択状態を管理
const toggleButtons = document.querySelectorAll('.cost-toggle button');
let isFixed = false; // デフォルトは変動費用

toggleButtons.forEach(btn => {
  btn.addEventListener('click', async () => {
    toggleButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    isFixed = btn.dataset.type === 'fixed';
    document.getElementById('categoryid').value = await getNextCategoryId(isFixed);
    await renderTable(isFixed);
  });
});

// 初期表示時
window.addEventListener('DOMContentLoaded', async () => {
  document.querySelector('.cost-toggle button[data-type="variable"]').classList.add('active');
  isFixed = false;
  document.getElementById('categoryid').value = await getNextCategoryId(isFixed);
  await renderTable(isFixed);
});

// 登録処理
form.addEventListener('submit', async e => {
  e.preventDefault();
  const table = isFixed ? 'infra_category' : 'category';

  const id = document.getElementById('categoryid').value;
  const name = document.getElementById('categoryname').value.trim();
  if (!name) return (message.textContent = 'カテゴリ名を入力してください。');

  const { error } = await supabase.from(table).insert([{ categoryid: id, categoryname: name }]);
  if (error) {
    message.textContent = '登録エラー: ' + error.message;
    return;
  }
  message.textContent = '登録しました！';
  document.getElementById('categoryname').value = '';
  document.getElementById('categoryid').value = await getNextCategoryId(isFixed);
  await renderTable(isFixed);
});

// 削除処理
deleteBtn.addEventListener('click', async () => {
  const checked = tableBody.querySelectorAll('input[type="checkbox"]:checked');
  if (checked.length === 0) return (message.textContent = '削除対象がありません。');

  const ids = Array.from(checked).map(cb => cb.value);
  const table = isFixed ? 'infra_category' : 'category';
  const { error } = await supabase.from(table).delete().in('categoryid', ids);
  if (error) {
    message.textContent = '削除エラー: ' + error.message;
    return;
  }
  message.textContent = '削除しました！';
  document.getElementById('categoryid').value = await getNextCategoryId(isFixed);
  await renderTable(isFixed);
});
