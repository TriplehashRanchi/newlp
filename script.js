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

// ===== CONTINUOUS MARQUEE SLIDER INITIALIZATION =====
const carouselTrack = document.getElementById("carouselTrack");
if (carouselTrack && carouselTrack.children.length > 0) {
  // Optional hover pause enhancement
  const container = carouselTrack.parentElement;
  if (container) {
    container.addEventListener("mouseenter", () => {
      carouselTrack.style.animationPlayState = "paused";
    });
    container.addEventListener("mouseleave", () => {
      carouselTrack.style.animationPlayState = "running";
    });
  }
}

// ===== MODAL LOGIC =====
function openModal() {
  const modal = document.getElementById("formModal");
  if (modal) {
    modal.style.display = "block";
    document.body.style.overflow = "hidden"; // Prevent background scrolling
  }
}

function closeModal() {
  const modal = document.getElementById("formModal");
  if (modal) {
    modal.style.display = "none";
    document.body.style.overflow = "auto"; // Restore background scrolling
  }
}

// Close when clicking outside
window.addEventListener("click", (event) => {
  const modal = document.getElementById("formModal");
  if (event.target === modal) {
    closeModal();
  }
});

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
