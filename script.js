document.addEventListener("DOMContentLoaded", () => {
  // --- 1. FADE-UP ANIMATION ON SCROLL  ---
  const animatedElements = document.querySelectorAll(".fade-up");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 },
  );

  animatedElements.forEach((element) => {
    observer.observe(element);
  });

  // --- 2. STATS COUNTER ANIMATION ---
  const statsSection = document.querySelector(".stats-section");

  if (statsSection) {
    let hasCounted = false;

    const countObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasCounted) {
            const counters = document.querySelectorAll(".counter");

            counters.forEach((counter) => {
              counter.innerText = "0";
              const target = +counter.getAttribute("data-target");
              const speed = 200; // Lower is  faster
              const increment = target / speed;

              const updateCount = () => {
                const current = +counter.innerText;
                if (current < target) {
                  counter.innerText = `${Math.ceil(current + increment)}`;
                  setTimeout(updateCount, 10);
                } else {
                  counter.innerText = target;
                }
              };

              updateCount();
            });

            hasCounted = true;
            countObserver.unobserve(statsSection);
          }
        });
      },
      { threshold: 0.5 },
    );

    countObserver.observe(statsSection);
  }

  // --- 3. FAQ ACCORDION ---
  const faqItems = document.querySelectorAll(".faq-item");
  faqItems.forEach((item) => {
    const question = item.querySelector(".faq-question");
    question.addEventListener("click", () => {
      const currentlyActive = document.querySelector(".faq-item.active");
      if (currentlyActive && currentlyActive !== item) {
        currentlyActive.classList.remove("active");
      }
      item.classList.toggle("active");
    });
  });
});

document.getElementById("year").textContent = new Date().getFullYear();

// ===== MARQUEE HOVER PAUSE =====
const carouselTrack = document.getElementById("carouselTrack");
if (carouselTrack) {
  const container = carouselTrack.closest(".carousel-row-wrapper");
  if (container) {
    container.addEventListener("mouseenter", () => {
      carouselTrack.style.animationPlayState = "paused";
    });
    container.addEventListener("mouseleave", () => {
      carouselTrack.style.animationPlayState = "running";
    });
  }
}


// Custom Dropdown Logic (migrated from form.html)
document.addEventListener("DOMContentLoaded", () => {
  const customSelects = document.querySelectorAll(".custom-select");

  customSelects.forEach((select) => {
    const trigger = select.querySelector(".select-trigger");
    const optionsContainer = select.querySelector(".select-options");
    const options = select.querySelectorAll(".option");
    const hiddenInput = select.querySelector('input[type="hidden"]');

    if (!trigger || !optionsContainer) return;

    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      // Close all other dropdowns
      customSelects.forEach((otherSelect) => {
        if (otherSelect !== select) {
          otherSelect.classList.remove("open");
        }
      });
      select.classList.toggle("open");
    });

    options.forEach((option) => {
      option.addEventListener("click", (e) => {
        e.stopPropagation();
        // Update trigger text and hidden input
        trigger.textContent = option.textContent;
        trigger.classList.add("selected");
        hiddenInput.value = option.getAttribute("data-value");

        // Close dropdown
        select.classList.remove("open");
      });
    });
  });

  // Close dropdowns when clicking outside
  document.addEventListener("click", () => {
    customSelects.forEach((select) => {
      select.classList.remove("open");
    });
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("leadForm");
  const submitBtn = form.querySelector(".submit-btn");

    // --- 1. CAPTURE UTM SOURCE ON PAGE LOAD (Optional but good for debugging) ---
  const urlParams = new URLSearchParams(window.location.search);
  const utmSource = urlParams.get("utm_source") || ""; // Default to empty string if not found
  
  // Update the hidden input field in the HTML (visual confirmation in Elements tab)
  const utmInput = form.querySelector('input[name="utm_source"]');
  if (utmInput) {
    utmInput.value = utmSource;
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    // Validate required dropdowns
    const requiredFields = ["role", "reason", "budget", "timeline"];
    for (let field of requiredFields) {
      const input = form.querySelector(`input[name="${field}"]`);
      if (!input || !input.value) {
        alert("Please complete all required selections.");
        return;
      }
    }

    submitBtn.disabled = true;
    submitBtn.innerText = "Submitting...";

    // 🔥 BUILD JSON PAYLOAD (IMPORTANT)
    const payload = {
      admin_id: "ADM6442",
      
      full_name: form.full_name.value,
      email: form.email.value,
      phone_number: form.phone_number.value,
      role: form.role.value,
      reason: form.reason.value,
      result: form.result.value || "",
      social: form.social.value,
      budget: form.budget.value,
      timeline: form.timeline.value,
      lead_gen: Array.from(
        form.querySelectorAll('input[name="lead_gen"]:checked')
      ).map((el) => el.value),
      utm_source: utmSource
    };

    console.log("Sending payload:", payload);

    try {
      const response = await fetch(
        "https://api.digitalgyanisaarthi.com/api/leads/embed",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Submission failed");
        throw new Error(data.message);
      }

      // ✅ SUCCESS
      window.location.href = "thanku.html";

    } catch (error) {
      console.error("Submit error:", error);
      submitBtn.disabled = false;
      submitBtn.innerText = "Submit Application";
    }
  });
});

// ===== WHATSAPP TESTIMONIAL INTERACTIVITY =====
document.addEventListener("DOMContentLoaded", () => {
  const waAppWindow = document.getElementById("waAppWindow");
  const waThemeToggle = document.getElementById("waThemeToggle");
  const waThemeLabel = document.getElementById("waThemeLabel");
  const waChatItemList = document.querySelectorAll(".wa-chat-item");
  const waChatPanes = document.querySelectorAll(".wa-chat-pane");
  const waActiveName = document.getElementById("waActiveName");
  const waActiveAvatar = document.getElementById("waActiveAvatar");
  const waActiveStatus = document.getElementById("waActiveStatus");
  const waMobileBackBtn = document.getElementById("waMobileBackBtn");

  const coachData = {
    abdullah: {
      name: "Abdullah Ansari",
      avatar: "/coach/1.webp",
      status: "Business Coach • online"
    },
    sakshi: {
      name: "Sakshi Chandrakar",
      avatar: "/coach/3.webp",
      status: "LinkedIn Coach • online"
    },
    abhinav: {
      name: "Abhinav Saxena",
      avatar: "/coach/4.webp",
      status: "Food Biz Coach • last seen yesterday"
    },
    shruti: {
      name: "Shruti Chaudhary",
      avatar: "/coach/5.webp",
      status: "Mind Coach • online"
    },
    harmeet: {
      name: "Harmeet Kelley",
      avatar: "/coach/6.webp",
      status: "Growth Coach • last seen Tuesday"
    },
    ruma: {
      name: "Ruma Pal",
      avatar: "/coach/7.webp",
      status: "Health Coach - online"
    },
    jagan: {
      name: "Jagan & Uma",
      avatar: "/coach/8.webp",
      status: "Health Coach - last seen Sunday"
    },
    "shruti-sethi": {
      name: "Shruti Sethi",
      avatar: "/coach/12.webp",
      status: "Relationship Coach - online"
    },
    apurva: {
      name: "Apurva Tare",
      avatar: "/coach/33.webp",
      status: "Inner Child Coach - last seen Thursday"
    },
    rashi: {
      name: "Rashi jain",
      avatar: "/coach/32.webp",
      status: "Fitness Coach - last seen Wednesday"
    },
    prakhar: {
      name: "Prakhar Kulshrestha",
      avatar: "/coach/10.webp",
      status: "Affiliate Marketing Coach - online"
    },
    priscilla: {
      name: "Priscilla Khambatta",
      avatar: "/coach/11.webp",
      status: "Leadership Coach - last seen Tuesday"
    },
    aparna: {
      name: "Aparna Ganesh",
      avatar: "/coach/9.webp",
      status: "Confidence Coach - online"
    },
    binita: {
      name: "Binita Srivastava",
      avatar: "/coach/13.webp",
      status: "Transformation Coach - last seen Sunday"
    },
    gracienne: {
      name: "Gracienne",
      avatar: "/coach/14.webp",
      status: "Health Coach - last seen Saturday"
    },
    neera: {
      name: "Neera Pande",
      avatar: "/coach/15.webp",
      status: "Business Coach - online"
    },
    vivek: {
      name: "Vivek Mashrani",
      avatar: "/coach/16.webp",
      status: "Stock Market Coach - last seen Friday"
    },
    shripal: {
      name: "Shripal Gandhi",
      avatar: "/coach/17.webp",
      status: "Growth Coach - last seen Thursday"
    },
    prakash: {
      name: "Prakash Gaba",
      avatar: "/coach/18.webp",
      status: "Stock Market Coach - last seen Wednesday"
    },
    madhu: {
      name: "Madhu Lakhlan",
      avatar: "/coach/19.webp",
      status: "Relationship Coach - last seen Wednesday"
    }
  };

  // 1. Chat Tab Switcher
  if (waChatItemList.length > 0) {
    waChatItemList.forEach((item) => {
      item.addEventListener("click", () => {
        const chatKey = item.getAttribute("data-chat");

        // Remove active class from all items & panes
        waChatItemList.forEach((el) => el.classList.remove("active"));
        waChatPanes.forEach((pane) => pane.classList.remove("active"));

        // Set active item & pane
        item.classList.add("active");
        const targetPane = document.getElementById(`chat-${chatKey}`);
        if (targetPane) {
          targetPane.classList.add("active");
        }

        // Update header details
        if (coachData[chatKey]) {
          if (waActiveName) waActiveName.textContent = coachData[chatKey].name;
          if (waActiveAvatar) waActiveAvatar.src = coachData[chatKey].avatar;
          if (waActiveStatus) waActiveStatus.textContent = coachData[chatKey].status;
        }

        // Mobile open chat window
        if (waAppWindow) {
          waAppWindow.classList.add("mobile-chat-open");
        }
      });
    });
  }

  // 2. Mobile Back Button
  if (waMobileBackBtn && waAppWindow) {
    waMobileBackBtn.addEventListener("click", () => {
      waAppWindow.classList.remove("mobile-chat-open");
    });
  }

  // 3. Centralized Theme Switching Function
  function setWhatsAppTheme(isDark) {
    if (!waAppWindow) return;
    const themeMenuTexts = document.querySelectorAll(".wa-theme-menu-text");

    if (isDark) {
      waAppWindow.classList.remove("wa-light-mode");
      waAppWindow.classList.add("wa-dark-mode");
      if (waThemeToggle) waThemeToggle.checked = true;
      if (waThemeLabel) {
        waThemeLabel.innerHTML = '<i class="fa-solid fa-moon"></i> WhatsApp Dark Mode';
      }
      themeMenuTexts.forEach((el) => {
        el.textContent = "Switch to Light Theme";
      });
    } else {
      waAppWindow.classList.remove("wa-dark-mode");
      waAppWindow.classList.add("wa-light-mode");
      if (waThemeToggle) waThemeToggle.checked = false;
      if (waThemeLabel) {
        waThemeLabel.innerHTML = '<i class="fa-solid fa-sun"></i> WhatsApp Light Mode';
      }
      themeMenuTexts.forEach((el) => {
        el.textContent = "Switch to Dark Theme";
      });
    }
  }

  if (waThemeToggle) {
    waThemeToggle.addEventListener("change", (e) => {
      setWhatsAppTheme(e.target.checked);
    });
  }

  // 4. Three-Dots Menu Dropdown & Theme Option Handler
  const waSidebarMenuBtn = document.getElementById("waSidebarMenuBtn");
  const waSidebarDropdown = document.getElementById("waSidebarDropdown");
  const waHeaderMenuBtn = document.getElementById("waHeaderMenuBtn");
  const waHeaderDropdown = document.getElementById("waHeaderDropdown");
  const themeMenuOpts = document.querySelectorAll(".wa-theme-menu-opt");

  if (waSidebarMenuBtn && waSidebarDropdown) {
    waSidebarMenuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (waHeaderDropdown) waHeaderDropdown.classList.remove("show");
      waSidebarDropdown.classList.toggle("show");
    });
  }

  if (waHeaderMenuBtn && waHeaderDropdown) {
    waHeaderMenuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (waSidebarDropdown) waSidebarDropdown.classList.remove("show");
      waHeaderDropdown.classList.toggle("show");
    });
  }

  themeMenuOpts.forEach((opt) => {
    opt.addEventListener("click", (e) => {
      e.stopPropagation();
      const isCurrentlyDark = waAppWindow.classList.contains("wa-dark-mode");
      setWhatsAppTheme(!isCurrentlyDark);
      if (waSidebarDropdown) waSidebarDropdown.classList.remove("show");
      if (waHeaderDropdown) waHeaderDropdown.classList.remove("show");
    });
  });

  // Close dropdowns on outside click
  document.addEventListener("click", () => {
    if (waSidebarDropdown) waSidebarDropdown.classList.remove("show");
    if (waHeaderDropdown) waHeaderDropdown.classList.remove("show");
  });

  // 4. Voice Note Audio Wave Simulation
  const playBtns = document.querySelectorAll(".wa-play-btn");
  playBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const vnId = btn.getAttribute("data-vn");
      const waveform = document.getElementById(`waveform-${vnId}`);
      const durationSpan = document.getElementById(`duration-${vnId}`);
      const icon = btn.querySelector("i");

      if (waveform.classList.contains("playing")) {
        // Pause
        waveform.classList.remove("playing");
        if (icon) {
          icon.classList.remove("fa-pause");
          icon.classList.add("fa-play");
        }
      } else {
        // Play
        waveform.classList.add("playing");
        if (icon) {
          icon.classList.remove("fa-play");
          icon.classList.add("fa-pause");
        }

        // Simulate voice playback timer
        let seconds = 38;
        const timer = setInterval(() => {
          if (!waveform.classList.contains("playing") || seconds <= 0) {
            clearInterval(timer);
            waveform.classList.remove("playing");
            if (icon) {
              icon.classList.remove("fa-pause");
              icon.classList.add("fa-play");
            }
            if (durationSpan) durationSpan.textContent = "0:38";
            return;
          }
          seconds--;
          const formatted = seconds < 10 ? `0:0${seconds}` : `0:${seconds}`;
          if (durationSpan) durationSpan.textContent = formatted;
        }, 1000);
      }
    });
  });
});

