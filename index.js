// index.js
const { createRoot } = ReactDOM;
const App = window.App; // Artık App, app-compiled.js'de window'a atanmıştır
const React = window.React;

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('root');
    if (container && App) {
        createRoot(container).render(
            React.createElement(React.StrictMode, null, 
                React.createElement(App, null)
            )
        );
    } else {
        console.error("Hata: 'root' elementi bulunamadı veya App bileşeni yüklenmedi.");
    }
});
