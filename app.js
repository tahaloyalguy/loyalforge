import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://ywrbojtzkkygahxqeueg.supabase.co";
const SUPABASE_KEY = "sb_publishable_bs-iScKh5LNlPhoCUfZybQ_yMVR0OmL";

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

// =========================
// DOM
// =========================

const assetGrid = document.getElementById("assetGrid");
const emptyState = document.getElementById("emptyState");

const searchInput = document.getElementById("searchInput");

const filterButtons = document.querySelectorAll(".filter-btn");
const sortButtons = document.querySelectorAll(".sort-btn");

const searchModal = document.getElementById("searchModal");
const searchModalInput = document.getElementById("searchModalInput");

let currentCategory = "all";
let currentSort = "latest";
let currentSearch = "";


// =========================
// HELPERS
// =========================

function escapeHTML(value) {
  if (value === null || value === undefined) return "";

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function formatNumber(value) {
  const number = Number(value || 0);

  if (number >= 1000000) {
    return `${(number / 1000000).toFixed(1)}M`;
  }

  if (number >= 1000) {
    return `${(number / 1000).toFixed(1)}K`;
  }

  return number.toString();
}


function formatFileSize(bytes) {
  const size = Number(bytes || 0);

  if (!size) return "";

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}


function showToast(message) {
  const toast = document.getElementById("toast");

  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(window.__loyalForgeToast);

  window.__loyalForgeToast = setTimeout(() => {
    toast.classList.remove("show");
  }, 2800);
}


// =========================
// LOAD ASSETS
// =========================

async function loadAssets() {
  if (!assetGrid) return;

  assetGrid.innerHTML = `
    <div style="
      grid-column: 1 / -1;
      padding: 60px 20px;
      text-align: center;
      color: #777;
    ">
      Loading assets...
    </div>
  `;

  let query = supabase
    .from("assets")
    .select(`
      id,
      title,
      slug,
      description,
      category,
      preview_url,
      file_name,
      file_size,
      file_format,
      downloads,
      likes,
      created_at,
      user_id,
      profiles (
        username,
        display_name,
        avatar_url
      )
    `)
    .eq("status", "published");

  // =========================
  // CATEGORY FILTER
  // =========================

  const categoryMap = {
    rigs: "Rig",
    models: "Model",
    thumbnails: "Thumbnail",
    other: "Other"
  };

  if (currentCategory !== "all") {

    const databaseCategory =
      categoryMap[currentCategory];

    if (databaseCategory) {
      query = query.eq(
        "category",
        databaseCategory
      );
    }

  }


  // =========================
  // SEARCH
  // =========================

  if (currentSearch.trim()) {

    const searchTerm =
      currentSearch.trim();

    query = query.or(
      `title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,file_format.ilike.%${searchTerm}%`
    );

  }

  // Sorting
  if (currentSort === "popular") {
    query = query.order("likes", {
      ascending: false
    });
  }

  else if (currentSort === "downloads") {
    query = query.order("downloads", {
      ascending: false
    });
  }

  else {
    query = query.order("created_at", {
      ascending: false
    });
  }

  query = query.limit(30);

  const { data, error } = await query;

  if (error) {
    console.error("LoyalForge Supabase error:", error);

    assetGrid.innerHTML = "";

    if (emptyState) {
      emptyState.style.display = "block";

      const title = emptyState.querySelector("h3");
      const text = emptyState.querySelector("p");

      if (title) {
        title.textContent = "Couldn't load assets";
      }

      if (text) {
        text.textContent =
          "There was a problem connecting to the asset database.";
      }
    }

    return;
  }

  renderAssets(data || []);
}


// =========================
// RENDER ASSETS
// =========================

function renderAssets(assets) {
  if (!assetGrid) return;

  assetGrid.innerHTML = "";

  if (!assets.length) {
    if (emptyState) {
      emptyState.style.display = "block";
    }

    return;
  }

  if (emptyState) {
    emptyState.style.display = "none";
  }

  assets.forEach(asset => {
    const card = document.createElement("article");

    card.className = "asset-card";

    const profile = asset.profiles || {};

    const creatorName =
      profile.display_name ||
      profile.username ||
      "Unknown Creator";

    const category =
      asset.category || "Asset";

    const preview = asset.preview_url
      ? `
        <img
          src="${escapeHTML(asset.preview_url)}"
          alt="${escapeHTML(asset.title)}"
          loading="lazy"
        >
      `
      : `
        <div class="asset-preview-placeholder">
          NO PREVIEW
        </div>
      `;

    card.innerHTML = `
      <div class="asset-preview">
        ${preview}
      </div>

      <div class="asset-info">

        <div class="asset-category">
          ${escapeHTML(category)}
        </div>

        <div class="asset-title">
          ${escapeHTML(asset.title)}
        </div>

        <div class="asset-creator">
          by ${escapeHTML(creatorName)}
        </div>

        <div class="asset-meta">

          <div class="asset-stats">
            <span>
              ♥ ${formatNumber(asset.likes)}
            </span>

            <span>
              ↓ ${formatNumber(asset.downloads)}
            </span>
          </div>

          <div class="asset-download">
            ${escapeHTML(
              asset.file_format ||
              formatFileSize(asset.file_size) ||
              "FILE"
            )}
          </div>

        </div>

      </div>
    `;
    card.style.cursor = "pointer";

    card.addEventListener("click", () => {
      if (asset.slug) {
        window.location.href = `asset.html?slug=${encodeURIComponent(asset.slug)}`;
      } else {
        window.location.href = `asset.html?id=${encodeURIComponent(asset.id)}`;
      }
    });
    
    assetGrid.appendChild(card);
  });
}


// =========================
// CATEGORY FILTERS
// =========================

filterButtons.forEach(button => {
  button.addEventListener("click", () => {

    filterButtons.forEach(btn => {
      btn.classList.remove("active");
    });

    button.classList.add("active");

    currentCategory =
      button.dataset.category || "all";

    loadAssets();
  });
});

// =========================
// CATEGORY CARDS
// =========================

document
  .querySelectorAll(".category-card")
  .forEach(card => {

    card.addEventListener("click", () => {

      const category =
        card.dataset.category || "all";

      currentCategory = category;

      filterButtons.forEach(button => {

        button.classList.toggle(
          "active",
          button.dataset.category === category
        );

      });

      loadAssets();

      document
        .getElementById("explore")
        ?.scrollIntoView({
          behavior: "smooth"
        });

    });

  });

// =========================
// SORT
// =========================

sortButtons.forEach(button => {
  button.addEventListener("click", () => {

    sortButtons.forEach(btn => {
      btn.classList.remove("active");
    });

    button.classList.add("active");

    currentSort =
      button.dataset.sort || "latest";

    loadAssets();
  });
});


// =========================
// SEARCH
// =========================

let searchTimeout;

if (searchInput) {
  searchInput.addEventListener("input", () => {

    clearTimeout(searchTimeout);

    searchTimeout = setTimeout(() => {

      currentSearch =
        searchInput.value.trim();

      loadAssets();

    }, 350);
  });
}


// =========================
// SEARCH MODAL
// =========================

function openSearchModal() {
  if (!searchModal) return;

  searchModal.classList.add("open");

  setTimeout(() => {
    searchModalInput?.focus();
  }, 50);
}


function closeSearchModal() {
  if (!searchModal) return;

  searchModal.classList.remove("open");
}


document
  .querySelectorAll("[data-search-open]")
  .forEach(button => {

    button.addEventListener(
      "click",
      openSearchModal
    );

  });


document
  .querySelectorAll("[data-search-close]")
  .forEach(button => {

    button.addEventListener(
      "click",
      closeSearchModal
    );

  });


if (searchModal) {
  searchModal.addEventListener("click", event => {

    if (event.target === searchModal) {
      closeSearchModal();
    }

  });
}


document.addEventListener("keydown", event => {

  if (event.key === "Escape") {
    closeSearchModal();
  }

});


// =========================
// MODAL SEARCH
// =========================

if (searchModalInput) {

  searchModalInput.addEventListener(
    "keydown",
    event => {

      if (event.key !== "Enter") {
        return;
      }

      const value =
        searchModalInput.value.trim();

      if (!value) {
        return;
      }

      if (searchInput) {
        searchInput.value = value;
      }

      currentSearch = value;

      closeSearchModal();

      loadAssets();

      document
        .getElementById("explore")
        ?.scrollIntoView({
          behavior: "smooth"
        });

    }
  );
}


// =========================
// UPLOAD BUTTONS
// =========================

document
  .querySelectorAll("[data-upload]")
  .forEach(button => {

    button.addEventListener("click", () => {

      window.location.href = "upload.html";

    });

  });


// =========================
// INITIAL LOAD
// =========================

loadAssets();

console.log(
  "%cLoyalForge",
  "color:#ff6a00;font-size:20px;font-weight:bold"
);

/* =========================================
   LOYALFORGE — PREMIUM SCROLL MOTION
   ========================================= */

const scrollSections = document.querySelectorAll(
  ".section, .creator-cta, .footer"
);

const scrollGrids = document.querySelectorAll(
  ".categories-grid, .asset-grid"
);

scrollSections.forEach((section) => {
  section.classList.add("scroll-reveal");
});

scrollGrids.forEach((grid) => {
  grid.classList.add("scroll-grid");
});


const scrollMotionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
      } else {
        entry.target.classList.remove("is-visible");
      }
    });
  },
  {
    threshold: 0.15,
    rootMargin: "0px 0px -80px 0px"
  }
);


document
  .querySelectorAll(".scroll-reveal, .scroll-grid")
  .forEach((element) => {
    scrollMotionObserver.observe(element);
  });
