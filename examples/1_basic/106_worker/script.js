import xnew from '@mulsense/xnew';

xnew(document.querySelector('#main'), Main);

function Main(unit) {
  xnew.nest('<div class="flex items-center justify-center w-full h-full bg-gray-50">');
  xnew(WorkerDemo);
}

function WorkerDemo(unit) {
  const worker = new Worker('./worker.js');

  xnew.nest('<div class="bg-white rounded-xl shadow-md p-8 w-80 flex flex-col gap-4">');
  xnew('<h1 class="text-xl font-bold text-center text-gray-700">', 'Web Worker Demo');
  xnew('<p class="text-sm text-gray-400 text-center">', 'フィボナッチ数列を Worker で計算');

  const controls = xnew(Controls);
  const status = xnew('<p class="text-center text-sm text-gray-500 h-5">');
  const result = xnew('<p class="text-center text-3xl font-mono font-bold text-green-600 h-10">');

  // Controls から '-send' イベントを受け取り Worker へ送信
  controls.on('-send', ({ n }) => {
    controls.setEnabled(false);
    status.element.textContent = `fib(${n}) を計算中...`;
    result.element.textContent = '';

    // Worker の完了を Promise でラップ
    const promise = new Promise((resolve) => {
      worker.onmessage = (e) => resolve(e.data);
    });
    worker.postMessage(n);

    // xnew のライフサイクルで管理される Promise（ユニット破棄後は無視される）
    xnew.promise(promise).then(({ n, result: res }) => {
      controls.setEnabled(true);
      status.element.textContent = `fib(${n}) の結果:`;
      result.element.textContent = res.toLocaleString();
    });
  });

  // ユニット破棄時に Worker を終了
  unit.on('finalize', () => worker.terminate());
}

function Controls(unit) {
  xnew.nest('<div class="flex gap-2">');

  const input = xnew('<input type="number" class="flex-1 border rounded-lg px-3 py-2 text-center focus:outline-none focus:ring-2 focus:ring-blue-300" min="1" max="40" value="10">');
  const btn = xnew('<button class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">', '計算する');

  btn.on('click', () => {
    const n = parseInt(input.element.value);
    if (!isNaN(n) && n >= 1 && n <= 40) {
      xnew.emit('-send', { n });
    }
  });

  return {
    setEnabled(enabled) {
      btn.element.disabled = !enabled;
    },
  };
}
