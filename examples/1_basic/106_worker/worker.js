// メインスレッドからのメッセージを受信して計算する
self.onmessage = function(e) {
  const n = e.data;
  console.log(`Worker: Received ${n}, calculating...`);
  const result = fibonacci(n);
  self.postMessage({ n, result });
};

// 再帰的なフィボナッチ計算（意図的に重い処理でWorkerの効果を実感）
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}
