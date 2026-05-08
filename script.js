import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, getDoc, deleteDoc, updateDoc, doc, serverTimestamp, query, where } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

const CONFIG = {
    FIREBASE_CONFIG: {
        apiKey: "AIzaSyAPiiVfmJdGHje0gittK-7yFTYNTQNY6Fk",
        authDomain: "basjfk-58536.firebaseapp.com",
        projectId: "basjfk-58536",
        storageBucket: "basjfk-58536.firebasestorage.app",
        messagingSenderId: "662162908373",
        appId: "1:662162908373:web:b5a789fd0b6ca6964e2e5c"
    }
};

const app = initializeApp(CONFIG.FIREBASE_CONFIG);
const db = getFirestore(app);
let allProducts = [];

window.showCustomAlert = (message) => {
    const alertBox = document.createElement('div');
    alertBox.innerHTML = `<i class="fa-solid fa-circle-check" style="font-size: 1.5rem; margin-bottom: 5px;"></i><br>${message}`;
    
    alertBox.style.cssText = `
        position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
        background: rgba(46, 204, 113, 0.95); color: white; padding: 15px 30px;
        border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        z-index: 10000; font-weight: bold; text-align: center; backdrop-filter: blur(5px);
        animation: dropDown 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
    `;
    document.body.appendChild(alertBox);
    
    if(!document.getElementById('alert-styles')){
        const style = document.createElement('style');
        style.id = 'alert-styles';
        style.innerHTML = `
            @keyframes dropDown { 0% { top: -100px; opacity: 0; } 100% { top: 20px; opacity: 1; } }
            @keyframes fadeOutUp { 0% { top: 20px; opacity: 1; } 100% { top: -100px; opacity: 0; } }
        `;
        document.head.appendChild(style);
    }

    setTimeout(() => {
        alertBox.style.animation = 'fadeOutUp 0.5s ease forwards';
        setTimeout(() => alertBox.remove(), 500);
    }, 3000);
};

// === خوارزمية الضغط التكيفي (Adaptive Compression) ===
async function compressAndEncodeImage(file) {
    if (!file) return null;
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                // تحديد 500 بكسل لأنها تعطي وضوح ممتاز جداً على شاشات الهواتف
                const MAX_WIDTH = 500; 
                let scaleSize = 1;
                if (img.width > MAX_WIDTH) {
                    scaleSize = MAX_WIDTH / img.width;
                }
                canvas.width = img.width * scaleSize;
                canvas.height = img.height * scaleSize;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                // نبدأ بجودة عالية 80%
                let quality = 0.8;
                let dataUrl = canvas.toDataURL('image/jpeg', quality);
                
                // عملية فحص ذكية:
                // طالما أن حجم النص (الصورة) أكبر من 24 كيلوبايت، قم بتقليل الجودة
                // هذا يضمن مساحة كافية لرفع 40-50 صورة داخل 1 ميجابايت
                while (dataUrl.length > 24000 && quality > 0.3) {
                    quality -= 0.1;
                    dataUrl = canvas.toDataURL('image/jpeg', quality);
                }
                
                resolve(dataUrl);
            };
        };
        reader.onerror = error => reject(error);
    });
}

window.verifyAdmin = () => {
    const pass = document.getElementById('admin-pass').value;
    if (pass === '1001') {
        document.getElementById('login-overlay').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('login-overlay').style.display = 'none';
            document.getElementById('app-content').style.display = 'flex';
            loadOrders('pending');
        }, 500);
    } else {
        alert('رمز الدخول غير صحيح!');
    }
};

window.switchTab = (tabId) => {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    
    const activeNavItem = document.querySelector(`.nav-item[onclick*="switchTab('${tabId}')"]`);
    if (activeNavItem) {
        activeNavItem.classList.add('active');
    }

    if(tabId === 'categories') loadCategories();
    if(tabId === 'products') { loadCategoriesForSelect(); loadProducts(); }
    if(tabId === 'offers') loadOffers();
    if(tabId === 'discount-offers') loadDiscountProducts();
    if(tabId === 'banners') loadBanners();
    if(tabId === 'orders') loadOrders('pending');
    if(tabId === 'accepted-orders') loadOrders('accepted');
    if(tabId === 'sales') loadSales();
};

window.saveCategory = async () => {
    const id = document.getElementById('cat-id').value;
    const name = document.getElementById('cat-name').value;
    const file = document.getElementById('cat-img').files[0];

    if (!name) return showCustomAlert('أدخل اسم القسم');
    const btn = document.getElementById('btn-save-cat');
    btn.innerText = 'جاري المعالجة...';

    try {
        let updateData = { name };
        if (file) {
            updateData.image = await compressAndEncodeImage(file);
        }

        if (id) {
            await updateDoc(doc(db, "categories", id), updateData);
        } else {
            if (!file) throw new Error('اختر صورة للقسم الجديد');
            await addDoc(collection(db, "categories"), { ...updateData, createdAt: serverTimestamp() });
        }

        document.getElementById('cat-id').value = '';
        document.getElementById('cat-name').value = '';
        document.getElementById('cat-img').value = '';
        btn.innerHTML = 'حفظ القسم <i class="fa-solid fa-save"></i>';
        showCustomAlert('تم حفظ القسم بنجاح');
        loadCategories();
    } catch (e) {
        showCustomAlert(e.message);
        btn.innerHTML = 'حفظ القسم <i class="fa-solid fa-save"></i>';
    }
};

window.loadCategories = async () => {
    const list = document.getElementById('categories-list');
    list.innerHTML = 'جاري التحميل...';
    const snapshot = await getDocs(collection(db, "categories"));
    list.innerHTML = '';
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        list.innerHTML += `
            <div class="card-3d">
                <img src="${data.image || ''}">
                <div class="card-title">${data.name}</div>
                <button class="btn-action edit" onclick="editCategory('${docSnap.id}', '${data.name}')">تعديل</button>
                <button class="btn-action delete" onclick="deleteDocItem('categories', '${docSnap.id}', null, loadCategories)">حذف</button>
            </div>
        `;
    });
};

window.editCategory = (id, name) => {
    document.getElementById('cat-id').value = id;
    document.getElementById('cat-name').value = name;
    document.getElementById('btn-save-cat').innerText = 'تحديث القسم';
};

window.loadCategoriesForSelect = async () => {
    const select = document.getElementById('prod-cat');
    select.innerHTML = '<option value="">اختر القسم</option>';
    const snapshot = await getDocs(collection(db, "categories"));
    snapshot.forEach(docSnap => {
        select.innerHTML += `<option value="${docSnap.data().name}">${docSnap.data().name}</option>`;
    });
};

window.saveProduct = async () => {
    const id = document.getElementById('prod-id').value;
    const name = document.getElementById('prod-name').value;
    const cat = document.getElementById('prod-cat').value;
    const desc = document.getElementById('prod-desc').value;
    const price = document.getElementById('prod-price').value;
    const files = document.getElementById('prod-images').files;

    if (!name || !price) return showCustomAlert('يرجى إكمال البيانات الأساسية للمنتج');
    
    const btn = document.getElementById('btn-save-prod');
    btn.innerText = 'جاري الضغط الذكي والحفظ...';

    try {
        let existingImages = [];
        
        if (id) {
            const productDoc = await getDoc(doc(db, "products", id));
            if (productDoc.exists()) {
                existingImages = productDoc.data().images || [];
            }
        }

        let newImages = [];
        for (let i = 0; i < files.length; i++) {
            // نستخدم هنا خوارزمية الضغط الذكية الخاصة بنا
            const base64Data = await compressAndEncodeImage(files[i]);
            const uniqueId = 'img_' + Date.now() + '_' + i; 
            newImages.push({ id: uniqueId, data: base64Data });
        }

        const allImages = existingImages.concat(newImages);

        let updateData = { 
            name, 
            category: cat, 
            desc, 
            price: Number(price),
            images: allImages 
        };

        if (id) {
            await updateDoc(doc(db, "products", id), updateData);
        } else {
            await addDoc(collection(db, "products"), { ...updateData, createdAt: serverTimestamp() });
        }

        showCustomAlert('تم حفظ المنتج بنجاح مع أقصى ضغط!'); 
        switchTab('products');
        
        document.getElementById('prod-id').value = '';
        document.getElementById('prod-name').value = '';
        document.getElementById('prod-desc').value = '';
        document.getElementById('prod-price').value = '';
        document.getElementById('prod-images').value = '';
        
        btn.innerHTML = 'حفظ المنتج <i class="fa-solid fa-save"></i>';
    } catch (e) {
        showCustomAlert('خطأ! تم تجاوز حد 1 ميجابايت، يرجى تقليل عدد الصور قليلاً.');
        console.error(e);
        btn.innerHTML = 'حفظ المنتج <i class="fa-solid fa-save"></i>';
    }
};

window.loadProducts = async () => {
    const list = document.getElementById('products-list');
    list.innerHTML = 'جاري التحميل...';
    const snapshot = await getDocs(collection(db, "products"));
    list.innerHTML = '';
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const imgSrc = (data.images && data.images.length > 0) ? data.images[0].data : (data.image || '');
        list.innerHTML += `
            <div class="card-3d">
                <img src="${imgSrc}">
                <div class="card-title">${data.name}</div>
                <div style="font-weight:bold; color:#FF6B6B;">${data.price} د.ع</div>
                <button class="btn-action edit" onclick="editProduct('${docSnap.id}', '${data.name}', '${data.category}', '${data.desc}', '${data.price}')">تعديل</button>
                <button class="btn-action delete" onclick="deleteDocItem('products', '${docSnap.id}', null, loadProducts)">حذف</button>
            </div>
        `;
    });
};

window.editProduct = (id, name, cat, desc, price) => {
    document.getElementById('prod-id').value = id;
    document.getElementById('prod-name').value = name;
    document.getElementById('prod-cat').value = cat;
    document.getElementById('prod-desc').value = desc;
    document.getElementById('prod-price').value = price;
    document.getElementById('btn-save-prod').innerText = 'تحديث المنتج';
    window.scrollTo(0, 0); 
};

window.loadDiscountProducts = async () => {
    const selectList = document.getElementById('discount-products-select-list');
    const discountList = document.getElementById('discounted-products-list');
    selectList.innerHTML = 'جاري التحميل...';
    discountList.innerHTML = '';

    const snapshot = await getDocs(collection(db, "products"));
    allProducts = [];
    selectList.innerHTML = '';
    
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        allProducts.push({ id: docSnap.id, ...data });
        
        const imgSrc = (data.images && data.images.length > 0) ? data.images[0].data : (data.image || '');

        if (!data.hasDiscount) {
            selectList.innerHTML += `
                <div class="card-3d" style="padding: 10px;">
                    <input type="checkbox" class="discount-checkbox" value="${docSnap.id}">
                    <img src="${imgSrc}" style="height: 80px;">
                    <div style="font-size: 0.9rem;">${data.name}</div>
                    <div style="font-weight:bold; color:#333;">${data.price} د.ع</div>
                </div>
            `;
        } else {
            discountList.innerHTML += `
                <div class="card-3d">
                    <img src="${imgSrc}">
                    <div class="card-title">${data.name}</div>
                    <div style="text-decoration: line-through; color: #999;">${data.originalPrice} د.ع</div>
                    <div style="font-weight:bold; color:#2ecc71;">${data.price} د.ع (خصم ${data.discountPercent}%)</div>
                    <button class="btn-action remove-discount" onclick="removeDiscount('${docSnap.id}', ${data.originalPrice})">إلغاء الخصم</button>
                </div>
            `;
        }
    });
};

window.applyDiscountToSelected = async () => {
    const percent = document.getElementById('discount-percent').value;
    if (!percent || percent <= 0 || percent >= 100) return showCustomAlert('أدخل نسبة خصم صحيحة بين 1 و 99');
    
    const checkboxes = document.querySelectorAll('.discount-checkbox:checked');
    if (checkboxes.length === 0) return showCustomAlert('اختر منتجات لتطبيق الخصم');

    for (let cb of checkboxes) {
        const product = allProducts.find(p => p.id === cb.value);
        if (product) {
            const originalPrice = product.price;
            const newPrice = Math.round(originalPrice - (originalPrice * (percent / 100)));
            await updateDoc(doc(db, "products", product.id), {
                price: newPrice,
                originalPrice: originalPrice,
                hasDiscount: true,
                discountPercent: percent
            });
        }
    }
    showCustomAlert('تم تطبيق الخصم بنجاح');
    document.getElementById('discount-percent').value = '';
    loadDiscountProducts();
};

window.removeDiscount = async (id, originalPrice) => {
    await updateDoc(doc(db, "products", id), {
        price: originalPrice,
        originalPrice: null,
        hasDiscount: false,
        discountPercent: null
    });
    loadDiscountProducts();
};

window.saveOffer = async () => {
    const files = document.getElementById('offer-img').files;
    if (files.length === 0) return showCustomAlert('اختر صور');
    const btn = document.getElementById('btn-save-offer');
    btn.innerText = 'جاري المعالجة...';
    try {
        for(let f of files) {
            const base64Img = await compressAndEncodeImage(f);
            await addDoc(collection(db, "offers"), { image: base64Img, createdAt: serverTimestamp() });
        }
        showCustomAlert('تم الحفظ');
        loadOffers();
    } catch(e) { showCustomAlert(e.message); }
    btn.innerHTML = 'حفظ العرض <i class="fa-solid fa-save"></i>';
};

window.loadOffers = async () => {
    const list = document.getElementById('offers-list');
    list.innerHTML = 'جاري التحميل...';
    const snapshot = await getDocs(collection(db, "offers"));
    list.innerHTML = '';
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        list.innerHTML += `
            <div class="card-3d">
                <img src="${data.image}">
                <button class="btn-action delete" onclick="deleteDocItem('offers', '${docSnap.id}', null, loadOffers)">حذف</button>
            </div>
        `;
    });
};

window.saveBanner = async () => {
    const files = document.getElementById('banner-img').files;
    if (files.length === 0) return showCustomAlert('اختر صور');
    const btn = document.getElementById('btn-save-banner');
    btn.innerText = 'جاري المعالجة...';
    try {
        for(let f of files) {
            const base64Img = await compressAndEncodeImage(f);
            await addDoc(collection(db, "banners"), { image: base64Img, createdAt: serverTimestamp() });
        }
        showCustomAlert('تم الحفظ');
        loadBanners();
    } catch(e) { showCustomAlert(e.message); }
    btn.innerHTML = 'حفظ البنر <i class="fa-solid fa-save"></i>';
};

window.loadBanners = async () => {
    const list = document.getElementById('banners-list');
    list.innerHTML = 'جاري التحميل...';
    const snapshot = await getDocs(collection(db, "banners"));
    list.innerHTML = '';
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        list.innerHTML += `
            <div class="card-3d">
                <img src="${data.image}">
                <button class="btn-action delete" onclick="deleteDocItem('banners', '${docSnap.id}', null, loadBanners)">حذف</button>
            </div>
        `;
    });
};

window.loadOrders = async (status) => {
    const list = document.getElementById(status === 'pending' ? 'orders-list' : 'accepted-orders-list');
    list.innerHTML = 'جاري التحميل...';
    const q = query(collection(db, "orders"), where("status", "==", status));
    const snapshot = await getDocs(q);
    list.innerHTML = '';
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        
        let orderDate = '';
        if (data.createdAt) {
            const d = data.createdAt.toDate();
            orderDate = d.toLocaleDateString('ar-EG') + ' ' + d.toLocaleTimeString('ar-EG');
        }

        let btns = `<button class="btn-action delete" onclick="deleteDocItem('orders', '${docSnap.id}', null, () => loadOrders('${status}'))">حذف</button>`;
        if (status === 'pending') btns = `<button class="btn-action accept" onclick="acceptOrder('${docSnap.id}')">قبول</button>` + btns;
        
        let itemsHtml = '';
        if(data.items && data.items.length > 0) {
            data.items.forEach(item => {
                itemsHtml += `
                <div style="display:flex; align-items:center; gap:10px; margin-top:8px; border-bottom:1px solid #ddd; padding-bottom:8px; background: rgba(255,255,255,0.5); padding: 5px; border-radius: 8px;">
                    <img src="${item.image}" style="width:50px; height:50px; object-fit:cover; border-radius:5px; border: 1px solid #ccc;">
                    <div style="text-align: right; line-height: 1.2;">
                        <span style="font-size:13px; font-weight:bold; color:#333;">${item.name}</span><br>
                        <span style="font-size:12px; color:#FF6B6B;">الكمية: ${item.qty} | السعر: ${item.price} د.ع</span>
                    </div>
                </div>`;
            });
        }

        let discountHtml = data.totalDiscount > 0 ? `<div style="color: #2ecc71; font-size: 14px; margin-bottom: 5px;"><strong>قيمة الخصم:</strong> ${data.totalDiscount} د.ع</div>` : '';

        list.innerHTML += `
            <div class="card-3d" style="text-align: right; direction: rtl; padding: 20px;">
                <div class="card-title" style="border-bottom: 2px solid #eee; padding-bottom: 10px; margin-bottom: 10px;">طلب رقم: ${docSnap.id.slice(0,5)}</div>
                <div style="color:#555; font-size: 14px; margin-bottom: 5px;"><strong>الاسم:</strong> ${data.name || 'غير متوفر'}</div>
                <div style="color:#555; font-size: 14px; margin-bottom: 5px;"><strong>رقم الهاتف:</strong> ${data.phone || 'غير متوفر'}</div>
                <div style="color:#555; font-size: 14px; margin-bottom: 5px;"><strong>العنوان:</strong> ${data.address || 'غير متوفر'}</div>
                <div style="color:#555; font-size: 14px; margin-bottom: 10px;"><strong>التاريخ والوقت:</strong> ${orderDate}</div>
                ${discountHtml}
                
                <div style="margin:15px 0; max-height: 150px; overflow-y: auto;">
                    <strong style="color:#333; font-size: 14px;">المنتجات المطلوبة:</strong>
                    ${itemsHtml || '<p style="font-size: 12px; color: #999;">لا توجد منتجات مسجلة</p>'}
                </div>
                
                <div style="font-weight:bold; color:#FF6B6B; font-size: 16px; text-align: center; margin-top: 15px; border-top: 2px solid #eee; padding-top: 10px;">
                    الإجمالي: ${data.total || '0'} د.ع
                </div>
                <div style="margin-top:15px; text-align:center;">${btns}</div>
            </div>
        `;
    });
};

window.loadSales = async () => {
    const list = document.getElementById('sales-list');
    list.innerHTML = 'جاري التحميل...';
    const q = query(collection(db, "orders"), where("status", "==", "accepted"));
    const snapshot = await getDocs(q);
    
    let salesByMonth = {};
    
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.createdAt) {
            const d = data.createdAt.toDate();
            const monthYear = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
            if (!salesByMonth[monthYear]) {
                salesByMonth[monthYear] = 0;
            }
            salesByMonth[monthYear] += data.total || 0;
        }
    });
    
    list.innerHTML = '';
    for (const [month, total] of Object.entries(salesByMonth)) {
        list.innerHTML += `
            <div class="card-3d" style="text-align: center; padding: 20px;">
                <div class="card-title" style="font-size: 1.2rem; margin-bottom: 15px;">شهر: ${month}</div>
                <div style="font-weight:bold; color:#2ecc71; font-size: 1.5rem;">${total} د.ع</div>
            </div>
        `;
    }
    
    if (Object.keys(salesByMonth).length === 0) {
        list.innerHTML = '<p style="color: white; text-align: center; width: 100%; font-size: 1.2rem;">لا توجد مبيعات</p>';
    }
};

window.resetSales = async () => {
    if(!confirm('هل أنت متأكد من تصفير جميع المبيعات؟ (سيتم حذف الطلبات المقبولة)')) return;
    try {
        const q = query(collection(db, "orders"), where("status", "==", "accepted"));
        const snapshot = await getDocs(q);
        snapshot.forEach(async (docSnap) => {
            await deleteDoc(doc(db, "orders", docSnap.id));
        });
        loadSales();
        loadOrders('accepted');
    } catch(e) {
        showCustomAlert(e.message);
    }
};

window.acceptOrder = async (id) => {
    await updateDoc(doc(db, "orders", id), { status: 'accepted' });
    loadOrders('pending');
};

window.deleteDocItem = async (col, id, unused, cb) => {
    if(!confirm('هل أنت متأكد من الحذف؟')) return;
    try {
        await deleteDoc(doc(db, col, id));
        cb();
    } catch(e) { showCustomAlert(e.message); }
};
