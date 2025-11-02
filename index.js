// index.js (Nihai Basitleştirme)

// SADECE React'i ve ReactDOM'u çağırıyoruz.
// App, app-compiled.js dosyasının sonunda global window.App olarak tanımlanmıştır.

const App = window.App; // app-compiled.js'den gelir
const container = document.getElementById('root');

if (container && window.ReactDOM && App) {
    // Kütüphanelerin gerçekten yüklendiğinden emin olduktan sonra başlat.
    // DOMContentLoaded'den sonra değil, hemen yüklendiği anda başlatıyoruz.
    ReactDOM.createRoot(container).render(
        React.createElement(App, null)
    );
} else {
    // Bu uyarıyı alırsak CDN yükleme sırası sorunu olduğunu anlarız.
    console.warn("Hata: Temel kütüphaneler (React, ReactDOM, App) henüz yüklenmedi. CDN'leri kontrol edin.");
}

// NOT: `index.html`'de bu dosyanın `app-compiled.js`'den sonra yüklendiğinden emin olun.
