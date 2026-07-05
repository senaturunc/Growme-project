# GrowMe 🌸 | Yapay Zeka Destekli Kişisel Gelişim ve Motivasyon Platformu

GrowMe; kullanıcıların günlük hedefler belirlemesini, günlük yazıp duygu durumlarını takip etmesini ve rozetler kazanmasını sağlayan **yapay zeka destekli bir kişisel gelişim web uygulamasıdır**. 

Projede **Google Gemini API (gemini-3.5-flash)** kullanılarak kullanıcının gelişim istatistiklerine özel gerçek zamanlı koçluk ve interaktif rehberlik sağlanmaktadır.

---

##  Öne Çıkan Özellikler

###  1. Günlük Hedef Takip Sistemi
* "Hedeflerim" sayfasından dakikalık veya sayfa bazlı kişisel hedefler ekleme, silme ve düzenleme.
* Dashboard üzerinden günlük ilerlemeleri kolayca kaydedebilme ve hedefler tamamlandığında otomatik kazanılan rozetler.

###  2. Akıllı Günlük & Duygu Durumu Analizi
* Günlük yazma, düzenleme ve silme paneli.
* Günlük yazma sıklığına göre hesaplanan **"Günlük Seri (Streak)"** mekanizması.
* Günlük duygu durumunu (😄, 🙂, 😴, 😔) kaydedip istatistiksel olarak profil sayfasında takip edebilme.

###  3. AI Gelişim Sohbet Koçu (Chatbot)
* Sayfanın sağ altında yer alan, konuşma geçmişini (session context) hafızasında tutan interaktif sohbet balonu.
* Alışkanlık kazanımı, verimlilik veya kişisel motivasyon konularında yapay zeka ile doğrudan yazışma imkanı.

###  4. AI Haftalık Değerlendirme Raporu
* Haftalık sayfasına girilen çalışma/hedef dakikalarını ve aktif hedefleri okuyan analiz sistemi.
* Tek tıkla o haftaki performansın zayıf ve güçlü yanlarını analiz eden, yeni hafta için somut yol haritası sunan yapay zeka gelişim raporu.

---

##  Kullanılan Teknolojiler

* **Arka Uç (Backend):** Node.js, Express.js
* **Veri Tabanı (Database):** SQLite (Kullanıcı profilleri, hedefler, günlükler ve haftalık veriler için)
* **Yapay Zeka Entegrasyonu:** Google Gemini API (`gemini-3.5-flash` modeli)
* **Ön Yüz (Frontend):** HTML5, Vanilla CSS3, JavaScript (ES6+), Bootstrap 5
* **Sürüm Kontrolü:** Git / GitHub
* **Çevre Değişkenleri:** dotenv (.env dosyası üzerinden güvenli API Key yönetimi)

---

##  Kurulum ve Çalıştırma

Projeyi yerel bilgisayarınızda çalıştırmak için aşağıdaki adımları takip edebilirsiniz:

### 1. Depoyu Klonlayın
```bash
git clone https://github.com/senaturunc/Growme-project.git
cd Growme-project
```

### 2. Gerekli Bağımlılıkları Yükleyin
```bash
npm install
```

### 3. Yapay Zeka Şifresini Yapılandırın
Proje kök dizininde `.env` adında bir dosya oluşturun ve Google AI Studio'dan aldığınız Gemini API anahtarınızı ekleyin:
```env
GEMINI_API_KEY=SİZİN_GEMINI_API_KEYİNİZ
```

### 4. Sunucuyu Başlatın
```bash
node server.js
```
Sunucu başlatıldığında konsolda `Server çalışıyor: http://localhost:3000` yazısı görünecektir.

### 5. Tarayıcıda Açın
Tarayıcınızın adres çubuğuna gidip uygulamayı açabilirsiniz:
`http://localhost:3000`

---

##  Veritabanı Şeması (SQLite)
Uygulama arka planda veri bütünlüğünü korumak için `growme.db` adında yerel bir SQLite veritabanı kullanır. Tablolar şunlardır:
* `users`: Kullanıcı kimlik bilgileri ve şifreleri.
* `journals`: Tarih, metin ve duygu durumlarıyla birlikte kaydedilen günlükler.
* `goals`: Kullanıcının oluşturduğu hedefler, türleri ve günlük süreleri.
* `weekly`: Haftalık girilen hedef dakikalarının JSON formatında saklandığı tablo.
* `profiles`: Kullanıcı biyografisi, avatarı, streak sayısı ve istatistikleri.
