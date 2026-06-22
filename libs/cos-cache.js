/**
 * 腾讯云 COS 浏览器本地缓存（IndexedDB）
 * 对图片、视频、模型文件提供本地缓存，避免重复下载
 */
(function () {
  const DB_NAME = 'cos_cache';
  const DB_VERSION = 1;
  const STORE_NAME = 'blobs';

  let db = null;
  let dbReady = null;

  function openDB() {
    if (dbReady) return dbReady;
    dbReady = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e) => {
        const d = e.target.result;
        if (!d.objectStoreNames.contains(STORE_NAME)) {
          d.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = (e) => {
        db = e.target.result;
        resolve(db);
      };
      request.onerror = () => reject(request.error);
    });
    return dbReady;
  }

  function getKeyFromUrl(url) {
    return new URL(url).pathname.substring(1);
  }

  function isCOSUrl(url) {
    try {
      const u = new URL(url);
      return u.hostname.includes('.cos.') && u.hostname.includes('.myqcloud.com');
    } catch { return false; }
  }

  async function getFromCache(cosKey) {
    const d = await openDB();
    return new Promise((resolve) => {
      const tx = d.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(cosKey);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  }

  async function putToCache(cosKey, blob) {
    const d = await openDB();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(blob, cosKey);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * 从缓存获取 blob URL（缓存未命中则从 COS 下载并缓存）
   * @param {string} cosUrl - COS 原始 URL
   * @returns {Promise<string>} blob URL
   */
  window.getCOSBlob = async function (cosUrl) {
    if (!isCOSUrl(cosUrl)) {
      // 非 COS URL，直接 fetch 转 blob
      const r = await fetch(cosUrl);
      const blob = await r.blob();
      return URL.createObjectURL(blob);
    }

    const cosKey = getKeyFromUrl(cosUrl);

    // 1. 查缓存
    const cached = await getFromCache(cosKey);
    if (cached) {
      console.log('📦 缓存命中:', cosKey);
      return URL.createObjectURL(cached);
    }

    // 2. 从 COS 下载
    console.log('⬇ 下载中:', cosKey);
    const previewRes = await fetch('/api/preview?key=' + encodeURIComponent(cosKey));
    const blob = await previewRes.blob();

    // 3. 存入缓存（不阻塞返回）
    putToCache(cosKey, blob).catch(() => {});

    return URL.createObjectURL(blob);
  };

  /**
   * 初始化并升级数据库到 v2（支持 Blob 存储）
   */
  window.initCOSCache = function () {
    return openDB();
  };
})();
