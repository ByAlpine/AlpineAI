// index.js

// createRoot fonksiyonunu global ReactDOM objesinden alın.
const { createRoot } = ReactDOM;

// App değişkenini window objesinden alın (app-compiled.js'de atandı).
const App = window.App; 

// React değişkenini window objesinden alın.
const React = window.React;

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('root');
    
    // Yalnızca 'root' elementi ve App bileşeni mevcutsa uygulamayı başlat
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
