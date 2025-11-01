// index.js (Tanımlama Hatalarını Önlemek İçin Sadeleştirildi)

document.addEventListener('DOMContentLoaded', () => {
    // Kök elementini al
    const container = document.getElementById('root');
    
    // App bileşenini global window objesinden alıyoruz. (app-compiled.js'de atandı)
    const App = window.App; 
    
    // Yalnızca 'root' elementi ve App bileşeni mevcutsa uygulamayı başlat
    if (container && App) {
        // createRoot, ReactDOM'un içinden alınır.
        ReactDOM.createRoot(container).render(
            // React.createElement kullanılarak App bileşeni render edilir.
            React.createElement(React.StrictMode, null, 
                React.createElement(App, null)
            )
        );
    } else {
        console.error("Hata: 'root' elementi bulunamadı veya App bileşeni yüklenmedi.");
    }
});
