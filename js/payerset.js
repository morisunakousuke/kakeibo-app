import { supabase, loadPayers } from './common.js';

const form = document.getElementById('payerForm');
const message = document.getElementById('message');
const tableBody = document.querySelector('#payerTable tbody');
const deleteBtn = document.getElementById('deleteBtn');

/** IDを採番 */
async function loadNextId() {
  const { count, error } = await supabase
    .from('payer')
    .select('payerid', { count: 'exact', head: true });

  if (error) {
    console.error(error);
    message.textContent = 'エラー: ' + error.message;
    return;
  }
  document.getElementById('payerid').value = String(count + 1).padStart(2, '0');
}

/** 支払者一覧の描画 */
async function renderTable() {
  try {
    const data = await loadPayers();
    tableBody.innerHTML = '';
    data.forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="checkbox"><input type="checkbox" value="${row.payerid}"></td>
        <td>${String(row.payerid).padStart(2, '0')}</td>
        <td>${row.payername}</td>
      `;
      tableBody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    message.textContent = err.message;
  }
}

/** 初期化 */
async function init() {
  await loadNextId();
  await renderTable();
}
init();

/** 登録処理 */
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payerid = document.getElementById('payerid').value;
  const payername = document.getElementById('payername').value.trim();

  if (!payername) return (message.textContent = '支払者名を入力してください。');

  const { error } = await supabase
    .from('payer')
    .insert([{ payerid, payername }]);

  if (error) {
    message.textContent = '追加エラー: ' + error.message;
  } else {
    message.textContent = '追加しました！';
    document.getElementById('payername').value = '';
    await loadNextId();
    await renderTable();
  }
});

/** 削除処理 */
deleteBtn.addEventListener('click', async () => {
  const selected = Array.from(document.querySelectorAll('input[type="checkbox"]:checked'))
    .map(cb => cb.value);
  if (selected.length === 0) return alert('削除する行を選択してください。');
  if (!confirm(`${selected.length}件を削除しますか？`)) return;

  const { error } = await supabase.from('payer').delete().in('payerid', selected);

  if (error) {
    message.textContent = '削除エラー: ' + error.message;
  } else {
    message.textContent = '削除しました！';
    await loadNextId();
    await renderTable();
  }
});
