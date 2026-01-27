// ============================================
// TRAVI-Style Attractions Page JavaScript
// Smooth animations and interactions
// ============================================

console.log('✨ TRAVI Attractions Page Loaded!');

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// ============================================
// CAROUSEL DOTS FUNCTIONALITY
// ============================================
const carouselDots = document.querySelectorAll('.carousel-dots .dot');
const featuredImage = document.querySelector('.featured-image');
const locationName = document.querySelector('.location-name');
const locationCountry = document.querySelector('.location-country');

// Sample attractions for carousel
const attractions = [
    {
        image: 'https://images.unsplash.com/photo-1542401886-65d6c61db217?w=800&h=1000&fit=crop',
        name: 'Marina Bay Sands',
        country: 'Singapore'
    },
    {
        image: 'https://images.unsplash.com/photo-1506968430157-2c66581f8c91?w=800&h=1000&fit=crop',
        name: 'Gardens by the Bay',
        country: 'Singapore'
    },
    {
        image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&h=1000&fit=crop',
        name: 'Universal Studios',
        country: 'Singapore'
    },
    {
        image: 'https://images.unsplash.com/photo-1520656693924-c0db89291f42?w=800&h=1000&fit=crop',
        name: 'Phi Phi Islands',
        country: 'Thailand'
    },
    {
        image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&h=1000&fit=crop',
        name: 'Burj Khalifa',
        country: 'UAE'
    }
];

let currentIndex = 0;

// Update carousel
function updateCarousel(index) {
    if (!featuredImage || !locationName || !locationCountry) return;
    
    currentIndex = index;
    
    // Update dots
    carouselDots.forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
    });
    
    // Fade out
    featuredImage.style.opacity = '0';
    locationName.parentElement.style.opacity = '0';
    
    setTimeout(() => {
        featuredImage.src = attractions[index].image;
        locationName.textContent = attractions[index].name;
        locationCountry.textContent = attractions[index].country;
        
        // Fade in
        featuredImage.style.opacity = '1';
        locationName.parentElement.style.opacity = '1';
    }, 300);
}

// Dot click handlers
carouselDots.forEach((dot, index) => {
    dot.addEventListener('click', () => updateCarousel(index));
});

// Auto-rotate carousel
let autoRotate = setInterval(() => {
    const nextIndex = (currentIndex + 1) % attractions.length;
    updateCarousel(nextIndex);
}, 5000);

// Pause on hover
const heroVisual = document.querySelector('.hero-visual');
if (heroVisual) {
    heroVisual.addEventListener('mouseenter', () => {
        clearInterval(autoRotate);
    });
    
    heroVisual.addEventListener('mouseleave', () => {
        autoRotate = setInterval(() => {
            const nextIndex = (currentIndex + 1) % attractions.length;
            updateCarousel(nextIndex);
        }, 5000);
    });
}

// ============================================
// SAVE/FAVORITE FUNCTIONALITY
// ============================================
const saveBadges = document.querySelectorAll('.badge-save');

saveBadges.forEach(badge => {
    badge.addEventListener('click', function(e) {
        e.stopPropagation();
        const icon = this.querySelector('i');
        
        if (icon.classList.contains('far')) {
            // Add to favorites
            icon.classList.remove('far');
            icon.classList.add('fas');
            this.style.background = 'rgba(239, 68, 68, 0.9)';
            this.style.color = 'white';
            
            // Heart beat animation
            this.style.animation = 'heartBeat 0.3s ease';
            setTimeout(() => {
                this.style.animation = '';
            }, 300);
            
            showNotification('Added to favorites! ❤️');
        } else {
            // Remove from favorites
            icon.classList.remove('fas');
            icon.classList.add('far');
            this.style.background = 'rgba(255, 255, 255, 0.9)';
            this.style.color = '#EF4444';
            
            showNotification('Removed from favorites');
        }
    });
});

// ============================================
// BOOK BUTTON FUNCTIONALITY
// ============================================
const bookButtons = document.querySelectorAll('.btn-book');

bookButtons.forEach(button => {
    button.addEventListener('click', function() {
        const card = this.closest('.attraction-card');
        const attractionName = card.querySelector('h3').textContent;
        
        // Show notification
        showNotification(`Opening booking for: ${attractionName} 🎫`);
        
        // Add ripple effect
        const ripple = document.createElement('span');
        ripple.style.cssText = `
            position: absolute;
            width: 100%;
            height: 100%;
            top: 0;
            left: 0;
            background: rgba(255, 255, 255, 0.5);
            border-radius: inherit;
            animation: ripple 0.6s ease-out;
            pointer-events: none;
        `;
        
        this.style.position = 'relative';
        this.style.overflow = 'hidden';
        this.appendChild(ripple);
        
        setTimeout(() => ripple.remove(), 600);
    });
});

// ============================================
// CATEGORY CARDS
// ============================================
const categoryCards = document.querySelectorAll('.category-card');

categoryCards.forEach(card => {
    card.addEventListener('click', function() {
        const categoryName = this.querySelector('h3').textContent;
        showNotification(`Showing: ${categoryName} 🎯`);
    });
});

// ============================================
// NOTIFICATION SYSTEM
// ============================================
function showNotification(message) {
    // Remove existing notification
    const existing = document.querySelector('.toast-notification');
    if (existing) existing.remove();
    
    // Create notification
    const notification = document.createElement('div');
    notification.className = 'toast-notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        left: 50%;
        transform: translateX(-50%) translateY(-100px);
        background: linear-gradient(135deg, #6443F4, #8B5CF6);
        color: white;
        padding: 1rem 2rem;
        border-radius: 50px;
        box-shadow: 0 10px 40px rgba(100, 67, 244, 0.3);
        z-index: 10000;
        font-weight: 600;
        font-size: 0.9375rem;
        animation: slideDown 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        backdrop-filter: blur(10px);
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideUp 0.3s ease forwards';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ============================================
// PARALLAX EFFECT ON SCROLL
// ============================================
window.addEventListener('scroll', function() {
    const scrolled = window.pageYOffset;
    const blobs = document.querySelectorAll('.gradient-blob');
    
    blobs.forEach((blob, index) => {
        const speed = 0.3 + (index * 0.1);
        blob.style.transform = `translateY(${scrolled * speed}px)`;
    });
});

// ============================================
// INTERSECTION OBSERVER FOR FADE-IN
// ============================================
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const fadeObserver = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Apply fade-in to elements
document.addEventListener('DOMContentLoaded', function() {
    const fadeElements = document.querySelectorAll('.category-card, .attraction-card');
    
    fadeElements.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(40px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        el.style.transitionDelay = `${index * 0.05}s`;
        fadeObserver.observe(el);
    });
});

// ============================================
// COUNTER ANIMATION FOR STATS
// ============================================
function animateCounter(element, target, duration = 2000) {
    let current = 0;
    const increment = target / (duration / 16);
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = target.toString().includes('+') ? target : target;
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current);
        }
    }, 16);
}

// Trigger counter animation when stats become visible
const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const statNumbers = document.querySelectorAll('.stat-number');
            statNumbers.forEach(stat => {
                const text = stat.textContent;
                if (text.includes('1,200')) {
                    stat.textContent = '0+';
                    animateCounter(stat, 1200);
                    setTimeout(() => stat.textContent = '1,200+', 2000);
                } else if (text === '16') {
                    stat.textContent = '0';
                    animateCounter(stat, 16);
                } else if (text.includes('4.9')) {
                    // Don't animate rating
                }
            });
            statsObserver.disconnect();
        }
    });
}, { threshold: 0.5 });

const heroStats = document.querySelector('.hero-stats');
if (heroStats) {
    statsObserver.observe(heroStats);
}

// ============================================
// CTA BUTTON ACTIONS
// ============================================
const btnPrimary = document.querySelector('.btn-primary');
const btnSecondary = document.querySelector('.btn-secondary');

if (btnPrimary) {
    btnPrimary.addEventListener('click', function() {
        document.querySelector('.top-attractions-section').scrollIntoView({
            behavior: 'smooth'
        });
    });
}

if (btnSecondary) {
    btnSecondary.addEventListener('click', function() {
        showNotification('Guides coming soon! 📚');
    });
}

// ============================================
// HOVER EFFECTS FOR STATS
// ============================================
const statItems = document.querySelectorAll('.stat-item');
statItems.forEach(item => {
    item.addEventListener('mouseenter', function() {
        this.style.transform = 'scale(1.05)';
        this.style.transition = 'transform 0.3s ease';
    });
    
    item.addEventListener('mouseleave', function() {
        this.style.transform = 'scale(1)';
    });
});

// ============================================
// ADD ANIMATION STYLES DYNAMICALLY
// ============================================
const animationStyles = document.createElement('style');
animationStyles.textContent = `
    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateX(-50%) translateY(-100px);
        }
        to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
    }
    
    @keyframes slideUp {
        from {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
        to {
            opacity: 0;
            transform: translateX(-50%) translateY(-100px);
        }
    }
    
    @keyframes heartBeat {
        0%, 100% { transform: scale(1); }
        25% { transform: scale(1.3); }
        50% { transform: scale(1.1); }
        75% { transform: scale(1.2); }
    }
    
    @keyframes ripple {
        0% {
            transform: scale(0);
            opacity: 1;
        }
        100% {
            transform: scale(2.5);
            opacity: 0;
        }
    }
    
    .featured-image {
        transition: opacity 0.3s ease;
    }
`;
document.head.appendChild(animationStyles);

// ============================================
// LOADING ANIMATION FOR IMAGES
// ============================================
document.querySelectorAll('.attraction-image img, .featured-image').forEach(img => {
    img.addEventListener('load', function() {
        this.style.animation = 'fadeIn 0.5s ease';
    });
});

// ============================================
// LOG SUCCESS
// ============================================
console.log('✅ All features initialized!');
console.log('🎨 Animations: Active');
console.log('🎯 Interactions: Ready');
console.log('💜 TRAVI Style: Applied');
