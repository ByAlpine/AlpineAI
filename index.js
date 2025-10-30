// index.js (YENİ - SAF JAVASCRIPT)

// Gerekli global fonksiyonları al
const { createRoot } = ReactDOM;
const App = window.App; 
const React = window.React; // React'i al

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('root');
    if (container && App) {
        // JSX kullanmak yerine saf React.createElement kullanıyoruz
        createRoot(container).render(
            React.createElement(React.StrictMode, null, 
                React.createElement(App, null)
            )
        );
    } else {
        console.error("Hata: 'root' elementi bulunamadı veya App bileşeni yüklenmedi.");
    }
});
