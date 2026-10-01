const burgerBtn=document.getElementById('burgerBtn');
  const closeBtn=document.getElementById('closeBtn');
  const mobileMenu=document.getElementById('mobileMenu');
  burgerBtn.addEventListener('click',()=>mobileMenu.classList.add('open'));
  closeBtn.addEventListener('click',()=>mobileMenu.classList.remove('open'));
  mobileMenu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>mobileMenu.classList.remove('open')));

  // fecha mínima = hoy
  const fechaInput=document.getElementById('fecha');
  if(fechaInput){
    const today=new Date().toISOString().split('T')[0];
    fechaInput.min=today;
    fechaInput.value=today;
  }

  // Animación de contadores
  const counters = document.querySelectorAll('.counter');
  const speed = 200; // Velocidad de la animación (menor es más rápido)

  const animateCounters = () => {
    counters.forEach(counter => {
      const updateCount = () => {
        const target = +counter.getAttribute('data-target');
        const count = +counter.innerText;
        const inc = target / speed;

        if (count < target) {
          counter.innerText = Math.ceil(count + inc);
          setTimeout(updateCount, 10);
        } else {
          counter.innerText = target;
        }
      };
      updateCount();
    });
  };

  // Observador para activar la animación solo cuando se ve en la pantalla
  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounters();
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  const heroStrip = document.querySelector('.hero-strip');
  if (heroStrip) {
    observer.observe(heroStrip);
  }

  // Observador para las tarjetas de servicios (animación futurista)
  const serviceCards = document.querySelectorAll('.service-card');
  const cardObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }, index * 150); // Efecto cascada
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });

  serviceCards.forEach(card => {
    // Inicializar el estado de la animación
    card.style.opacity = '0';
    card.style.transform = 'translateY(40px)';
    cardObserver.observe(card);
  });

  // Carousel destinos logic
  const destScroller = document.getElementById('dest-scroller');
  const leftArrow = document.querySelector('.left-arrow');
  const rightArrow = document.querySelector('.right-arrow');

  if (destScroller && leftArrow && rightArrow) {
    const scrollAmount = 266; // ancho de tarjeta + gap
    const scrollDuration = 1000; // 1 segundo (1000 ms)

    const smoothScroll = (element, distance, duration) => {
      let start = element.scrollLeft;
      let startTime = null;

      const animation = (currentTime) => {
        if (startTime === null) startTime = currentTime;
        const timeElapsed = currentTime - startTime;
        const progress = Math.min(timeElapsed / duration, 1);
        
        // Easing function (ease-in-out) para lentitud suave
        const ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;

        element.scrollLeft = start + (distance * ease);

        if (timeElapsed < duration) {
          requestAnimationFrame(animation);
        }
      };

      requestAnimationFrame(animation);
    };

    leftArrow.addEventListener('click', () => {
      smoothScroll(destScroller, -scrollAmount, scrollDuration);
    });

    rightArrow.addEventListener('click', () => {
      smoothScroll(destScroller, scrollAmount, scrollDuration);
    });

    // Auto-scroll (Movimiento lento)
    let autoScrollSpeed = 0.5; // Ajusta este valor para mayor o menor lentitud (píxeles por frame)
    let isHovering = false;

    destScroller.addEventListener('mouseenter', () => isHovering = true);
    destScroller.addEventListener('mouseleave', () => isHovering = false);

    const autoScroll = () => {
      if (!isHovering) {
        destScroller.scrollLeft += autoScrollSpeed;
        
        // Si llega al final, vuelve al principio suavemente (o instantáneamente)
        if (destScroller.scrollLeft >= (destScroller.scrollWidth - destScroller.clientWidth - 1)) {
          // Para un scroll infinito real se necesitaría clonar nodos.
          // Aquí simplemente lo regresamos al inicio cuando llega al final.
          destScroller.scrollLeft = 0;
        }
      }
      requestAnimationFrame(autoScroll);
    };

    // Iniciar auto-scroll
    requestAnimationFrame(autoScroll);
  }