// index.js (Basitleştirilmiş)
// Bu dosya, tüm uygulamayı (app-compiled.js) DOM'a bağlar.

const { createRoot } = ReactDOM;
const App = window.App; // app-compiled.js'de tanımlanan ana App bileşeni

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('root');
    if (container && App) {
        createRoot(container).render(
            <React.StrictMode>
                <App />
            </React.StrictMode>
        );
    } else {
        console.error("Hata: 'root' elementi bulunamadı veya App bileşeni yüklenmedi.");
    }
});