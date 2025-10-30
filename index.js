// Gerekli global kütüphanelerin yüklendiğinden emin olmak için ekleme
const App = window.App; // app-compiled.js'de atanan global App bileşenini kullan

const { BrowserRouter } = window.ReactRouterDOM || {}; // React Router'ı lokal olarak yükle

// ReactDOM, index.html içinde CDN'den yüklendi
const rootElement = document.getElementById('root');

if (rootElement && App) {
    // Uygulamayı başlat
    const root = ReactDOM.createRoot(rootElement);
    root.render(
        // BrowserRouter zaten App içinde tanımlı olduğu için burada sadeleştirilebilir,
        // ancak React'in katı modunda bırakmakta fayda var.
        React.createElement(React.StrictMode, null, React.createElement(App, null))
    );
} else {
    // Uygulamanın başlatılamadığını bildirmek için hata mesajı
    console.error("Hata: 'root' elementi bulunamadı veya App bileşeni yüklenmedi.");
}

// Tailwind uyarısını gizlemek için global stil tanımı (Gereksiz uyarıyı kapatır)
const style = document.createElement('style');
style.textContent = `
    .prose code::before, .prose code::after { content: normal !important; }
`;
document.head.appendChild(style);
