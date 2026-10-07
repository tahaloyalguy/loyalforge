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

console.log("LoyalForge assetGrid:", assetGrid);
console.log("LoyalForge emptyState:", emptyState);

const searchInput = document.getElementById("searchInput");

const filterButtons = document.querySelectorAll(".filter-btn");
const sortButtons = document.querySelectorAll(".sort-btn");

const searchModal = document.getElementById("searchModal");
const searchModalInput = document.getElementById("searchModalInput");

const loadMoreBtn = document.getElementById("loadMoreBtn");


// =========================
// STATE
// =========================

let currentCategory = "all";
let currentSort = "latest";
let currentSearch = "";

let currentPage = 0;

const assetsPerPage = 30;

let hasMoreAssets = true;
let isLoadingAssets = false;

let searchTimeout;


// =========================
// HELPERS
// =========================

function escapeHTML(value) {
  if (value === null || value === undefined) {
    return "";
  }

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

  if (!size) {
    return "";
  }

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

  if (!toast) {
    return;
  }

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(window.__loyalForgeToast);

  window.__loyalForgeToast = setTimeout(() => {
    toast.classList.remove("show");
  }, 2800);
}


// =========================
// ASSET URL
// =========================

function getAssetPageURL(asset) {

  if (!asset || !asset.id) {
    return null;
  }

  /*
   * همیشه با ID باز می‌کنیم.
   *
   * این باعث می‌شود Asset Page دقیقاً
   * رکورد درست Supabase را پیدا کند.
   */

  return `asset.html?id=${encodeURIComponent(asset.id)}`;
}


// =========================
// LOAD ASSETS
// =========================

async function loadAssets(reset = true) {

  if (!assetGrid) {
    return;
  }

  if (isLoadingAssets) {
    return;
  }

  isLoadingAssets = true;


  // =========================
  // RESET
  // =========================

  if (reset) {

    currentPage = 0;

    hasMoreAssets = true;

    if (loadMoreBtn) {
      loadMoreBtn.style.display = "none";
    }

  }


  // =========================
  // SUPABASE QUERY
  // =========================

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
      currentSearch
        .trim()
        .replace(/[%(),]/g, " ");


    query = query.or(
      `title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,file_format.ilike.%${searchTerm}%`
    );

  }


  // =========================
  // SORT
  // =========================

  if (currentSort === "popular") {

    query = query.order(
      "likes",
      {
        ascending: false,
        nullsFirst: false
      }
    );

  }

  else if (currentSort === "downloads") {

    query = query.order(
      "downloads",
      {
        ascending: false,
        nullsFirst: false
      }
    );

  }

  else {

    query = query.order(
      "created_at",
      {
        ascending: false
      }
    );

  }


  // =========================
  // PAGINATION
  // =========================

  const from =
    currentPage * assetsPerPage;

  const to =
    from + assetsPerPage - 1;


  query = query.range(
    from,
    to
  );


  // =========================
  // FETCH
  // =========================

  const {
    data,
    error
  } = await query;


  // =========================
  // ERROR
  // =========================

  if (error) {

    console.error(
      "LoyalForge Supabase error:",
      error
    );


    if (reset) {
      assetGrid.innerHTML = "";
    }


    if (emptyState) {

      emptyState.style.display =
        "block";


      const title =
        emptyState.querySelector("h3");


      const text =
        emptyState.querySelector("p");


      if (title) {

        title.textContent =
          "خطا در بارگذاری";

      }


      if (text) {

        text.textContent =
          "اتصال به پایگاه داده با مشکل مواجه شد.";

      }

    }


    isLoadingAssets = false;

    return;

  }


  const assets =
    data || [];


  // =========================
  // CHECK MORE
  // =========================

  if (assets.length < assetsPerPage) {

    hasMoreAssets = false;

  }


  // =========================
  // RENDER
  // =========================

  renderAssets(
    assets,
    !reset
  );


  // =========================
  // LOAD MORE
  // =========================

  if (loadMoreBtn) {

    loadMoreBtn.style.display =
      hasMoreAssets
        ? "block"
        : "none";

  }


  isLoadingAssets = false;

}


// =========================
// RENDER ASSETS
// =========================

function renderAssets(
  assets,
  append = false
) {

  if (!assetGrid) {
    return;
  }


  // =========================
  // CLEAR
  // =========================

  if (!append) {

    assetGrid.innerHTML = "";

  }


  // =========================
  // EMPTY
  // =========================

  if (
    !assets.length &&
    !append
  ) {

    if (emptyState) {

      emptyState.style.display =
        "block";


      const title =
        emptyState.querySelector("h3");


      const text =
        emptyState.querySelector("p");


      if (title) {

        title.textContent =
          "هنوز چیزی اینجا نیست.";

      }


      if (text) {

        text.textContent =
          "اولین سازنده‌ای باش که یک اثر برای جامعه LoyalForge منتشر می‌کنه.";

      }

    }


    return;

  }


  // =========================
  // HIDE EMPTY
  // =========================

  if (emptyState) {

    emptyState.style.display =
      "none";

  }


  // =========================
  // CARDS
  // =========================

  assets.forEach(asset => {

    if (!asset || !asset.id) {
      return;
    }


    const card =
      document.createElement("article");


    card.className =
      "asset-card";


    // =========================
    // PROFILE
    // =========================

    const profile =
      asset.profiles || {};


    const creatorName =
      profile.display_name ||
      profile.username ||
      "Unknown Creator";


    // =========================
    // CATEGORY
    // =========================

    const category =
      asset.category ||
      "Asset";


    // =========================
    // PREVIEW
    // =========================

    const preview =
      asset.preview_url
        ? `
          <img
            src="${escapeHTML(asset.preview_url)}"
            alt="${escapeHTML(asset.title || "Asset Preview")}"
            loading="lazy"
          >
        `
        : `
          <div class="asset-preview-placeholder">
            NO PREVIEW
          </div>
        `;


    // =========================
    // CARD HTML
    // =========================

    card.innerHTML = `

      <div class="asset-preview">

        ${preview}

      </div>


      <div class="asset-info">

        <div class="asset-category">

          ${escapeHTML(category)}

        </div>


        <div class="asset-title">

          ${escapeHTML(
            asset.title ||
            "Untitled Asset"
          )}

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


    // =========================
    // CLICK → ASSET PAGE
    // =========================

    card.style.cursor =
      "pointer";


    card.setAttribute(
      "role",
      "link"
    );


    card.setAttribute(
      "tabindex",
      "0"
    );


    const openAsset =
      () => {

        const url =
          getAssetPageURL(asset);


        if (!url) {

          console.error(
            "Asset has no ID:",
            asset
          );

          showToast(
            "شناسه این Asset پیدا نشد."
          );

          return;

        }


        window.location.href =
          url;

      };


    card.addEventListener(
      "click",
      openAsset
    );


    card.addEventListener(
      "keydown",
      event => {

        if (
          event.key === "Enter" ||
          event.key === " "
        ) {

          event.preventDefault();

          openAsset();

        }

      }
    );


    // =========================
    // APPEND
    // =========================

    assetGrid.appendChild(
      card
    );

  });

}


// =========================
// CATEGORY FILTERS
// =========================

filterButtons.forEach(button => {

  button.addEventListener(
    "click",
    () => {

      filterButtons.forEach(btn => {

        btn.classList.remove(
          "active"
        );

      });


      button.classList.add(
        "active"
      );


      currentCategory =
        button.dataset.category ||
        "all";


      loadAssets(
        true
      );

    }
  );

});


// =========================
// CATEGORY CARDS
// =========================

document
  .querySelectorAll(".category-card")
  .forEach(card => {

    card.addEventListener(
      "click",
      () => {

        const category =
          card.dataset.category ||
          "all";


        /*
         * دسته‌بندی Minecraft
         * فعلاً دسته دیتابیسی مستقل ندارد.
         *
         * برای جلوگیری از Query اشتباه،
         * فقط اگر دسته معتبر بود فیلتر می‌کنیم.
         */

        currentCategory =
          category;


        filterButtons.forEach(
          button => {

            button.classList.toggle(
              "active",
              button.dataset.category === category
            );

          }
        );


        loadAssets(
          true
        );


        document
          .getElementById("explore")
          ?.scrollIntoView({
            behavior: "smooth"
          });

      }
    );

  });


// =========================
// SORT
// =========================

sortButtons.forEach(button => {

  button.addEventListener(
    "click",
    () => {

      sortButtons.forEach(btn => {

        btn.classList.remove(
          "active"
        );

      });


      button.classList.add(
        "active"
      );


      currentSort =
        button.dataset.sort ||
        "latest";


      loadAssets(
        true
      );

    }
  );

});


// =========================
// SEARCH
// =========================

if (searchInput) {

  searchInput.addEventListener(
    "input",
    () => {

      clearTimeout(
        searchTimeout
      );


      searchTimeout =
        setTimeout(
          () => {

            currentSearch =
              searchInput.value.trim();


            loadAssets(
              true
            );

          },
          350
        );

    }
  );

}


// =========================
// SEARCH MODAL
// =========================

function openSearchModal() {

  if (!searchModal) {
    return;
  }


  searchModal.classList.add(
    "open"
  );


  setTimeout(
    () => {

      searchModalInput?.focus();

    },
    50
  );

}


function closeSearchModal() {

  if (!searchModal) {
    return;
  }


  searchModal.classList.remove(
    "open"
  );

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

  searchModal.addEventListener(
    "click",
    event => {

      if (
        event.target ===
        searchModal
      ) {

        closeSearchModal();

      }

    }
  );

}


// =========================
// SEARCH MODAL KEYBOARD
// =========================

if (searchModalInput) {

  searchModalInput.addEventListener(
    "keydown",
    event => {

      if (
        event.key !== "Enter"
      ) {

        return;

      }


      const value =
        searchModalInput.value.trim();


      if (!value) {
        return;
      }


      if (searchInput) {

        searchInput.value =
          value;

      }


      currentSearch =
        value;


      closeSearchModal();


      loadAssets(
        true
      );


      document
        .getElementById("explore")
        ?.scrollIntoView({
          behavior: "smooth"
        });

    }
  );

}


// =========================
// SEARCH KEYBOARD SHORTCUT
// =========================

document.addEventListener(
  "keydown",
  event => {

    if (
      (event.ctrlKey ||
       event.metaKey) &&
      event.key.toLowerCase() === "k"
    ) {

      event.preventDefault();

      openSearchModal();

    }


    if (
      event.key === "Escape"
    ) {

      closeSearchModal();

    }

  }
);


// =========================
// AUTH
// =========================

const authModal =
  document.getElementById(
    "authModal"
  );


const loginForm =
  document.getElementById(
    "loginForm"
  );


const registerForm =
  document.getElementById(
    "registerForm"
  );


const loginMessage =
  document.getElementById(
    "loginMessage"
  );


const registerMessage =
  document.getElementById(
    "registerMessage"
  );


const authTitle =
  document.getElementById(
    "authTitle"
  );


const authSubtitle =
  document.getElementById(
    "authSubtitle"
  );


const authSwitch =
  document.getElementById(
    "authSwitch"
  );


const authSwitchText =
  document.getElementById(
    "authSwitchText"
  );


const forgotPassword =
  document.getElementById(
    "forgotPassword"
  );


const accountButton =
  document.getElementById(
    "accountButton"
  );


let authMode =
  "login";


// =========================
// ACCOUNT BUTTON
// =========================

if (accountButton) {

  accountButton.addEventListener(
    "click",
    async () => {

      accountButton.disabled =
        true;


      try {

        const {
          data: {
            user
          },
          error
        } =
          await supabase.auth.getUser();


        if (error) {

          console.error(
            "Account check error:",
            error
          );

          window.location.href =
            "auth.html";

          return;

        }


        if (user) {

          window.location.href =
            "profile.html";

        }

        else {

          window.location.href =
            "auth.html";

        }

      }

      catch (error) {

        console.error(
          "Account button error:",
          error
        );

        window.location.href =
          "auth.html";

      }

    }
  );

}


// =========================
// AUTH MODAL
// =========================

function openAuthModal(
  mode = "login"
) {

  if (!authModal) {
    return;
  }


  authMode =
    mode;


  authModal.classList.add(
    "open"
  );


  authModal.setAttribute(
    "aria-hidden",
    "false"
  );


  updateAuthMode();

}


function closeAuthModal() {

  if (!authModal) {
    return;
  }


  authModal.classList.remove(
    "open"
  );


  authModal.setAttribute(
    "aria-hidden",
    "true"
  );


  clearAuthMessages();

}


function updateAuthMode() {

  if (
    !loginForm ||
    !registerForm
  ) {

    return;

  }


  const isLogin =
    authMode === "login";


  loginForm.style.display =
    isLogin
      ? ""
      : "none";


  registerForm.style.display =
    isLogin
      ? "none"
      : "";


  if (isLogin) {

    if (authTitle) {

      authTitle.textContent =
        "خوش برگشتی.";

    }


    if (authSubtitle) {

      authSubtitle.textContent =
        "برای ادامه وارد حساب کاربری خودت شو.";

    }


    if (authSwitchText) {

      authSwitchText.textContent =
        "حساب کاربری نداری؟";

    }


    if (authSwitch) {

      authSwitch.textContent =
        "ثبت‌نام کن";

    }

  }

  else {

    if (authTitle) {

      authTitle.textContent =
        "حساب جدید بساز.";

    }


    if (authSubtitle) {

      authSubtitle.textContent =
        "برای شروع فعالیت در LoyalForge ثبت‌نام کن.";

    }


    if (authSwitchText) {

      authSwitchText.textContent =
        "قبلاً حساب ساختی؟";

    }


    if (authSwitch) {

      authSwitch.textContent =
        "وارد شو";

    }

  }

}


// =========================
// AUTH CLOSE
// =========================

document
  .querySelectorAll("[data-auth-close]")
  .forEach(button => {

    button.addEventListener(
      "click",
      closeAuthModal
    );

  });


// =========================
// AUTH SWITCH
// =========================

if (authSwitch) {

  authSwitch.addEventListener(
    "click",
    () => {

      authMode =
        authMode === "login"
          ? "register"
          : "login";


      clearAuthMessages();


      updateAuthMode();

    }
  );

}


// =========================
// AUTH MESSAGES
// =========================

function showAuthMessage(
  element,
  message,
  type = "error"
) {

  if (!element) {
    return;
  }


  element.textContent =
    message;


  element.classList.remove(
    "error",
    "success"
  );


  element.classList.add(
    type
  );

}


function clearAuthMessages() {

  if (loginMessage) {

    loginMessage.textContent =
      "";

    loginMessage.classList.remove(
      "error",
      "success"
    );

  }


  if (registerMessage) {

    registerMessage.textContent =
      "";

    registerMessage.classList.remove(
      "error",
      "success"
    );

  }

}


// =========================
// LOGIN
// =========================

if (loginForm) {

  loginForm.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      clearAuthMessages();


      const email =
        document
          .getElementById(
            "loginEmail"
          )
          ?.value
          .trim();


      const password =
        document
          .getElementById(
            "loginPassword"
          )
          ?.value;


      const submitButton =
        loginForm.querySelector(
          'button[type="submit"]'
        );


      if (submitButton) {

        submitButton.disabled =
          true;


        submitButton.innerHTML =
          "در حال ورود...";

      }


      const {
        data,
        error
      } =
        await supabase.auth
          .signInWithPassword({
            email,
            password
          });


      if (error) {

        console.error(
          "Login error:",
          error
        );


        showAuthMessage(
          loginMessage,
          "ایمیل یا رمز عبور اشتباه است.",
          "error"
        );


        if (submitButton) {

          submitButton.disabled =
            false;


          submitButton.innerHTML =
            'ورود به حساب <span>←</span>';

        }


        return;

      }


      console.log(
        "Logged in:",
        data.user
      );


      showAuthMessage(
        loginMessage,
        "با موفقیت وارد شدی ✓",
        "success"
      );


      setTimeout(
        () => {

          closeAuthModal();

          updateAuthUI();

        },
        700
      );

    }
  );

}


// =========================
// REGISTER
// =========================

if (registerForm) {

  registerForm.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      clearAuthMessages();


      const username =
        document
          .getElementById(
            "registerUsername"
          )
          ?.value
          .trim();


      const email =
        document
          .getElementById(
            "registerEmail"
          )
          ?.value
          .trim();


      const password =
        document
          .getElementById(
            "registerPassword"
          )
          ?.value;


      if (
        !username ||
        username.length < 3
      ) {

        showAuthMessage(
          registerMessage,
          "نام کاربری باید حداقل ۳ کاراکتر باشد.",
          "error"
        );

        return;

      }


      if (
        password.length < 6
      ) {

        showAuthMessage(
          registerMessage,
          "رمز عبور باید حداقل ۶ کاراکتر باشد.",
          "error"
        );

        return;

      }


      const submitButton =
        registerForm.querySelector(
          'button[type="submit"]'
        );


      if (submitButton) {

        submitButton.disabled =
          true;


        submitButton.innerHTML =
          "در حال ساخت حساب...";

      }


      const {
        data,
        error
      } =
        await supabase.auth
          .signUp({

            email,

            password,

            options: {

              data: {

                username

              }

            }

          });


      if (error) {

        console.error(
          "Register error:",
          error
        );


        showAuthMessage(
          registerMessage,
          error.message,
          "error"
        );


        if (submitButton) {

          submitButton.disabled =
            false;


          submitButton.innerHTML =
            'ساخت حساب <span>←</span>';

        }


        return;

      }


      if (
        data.user &&
        !data.session
      ) {

        showAuthMessage(
          registerMessage,
          "حساب ساخته شد. ایمیلت رو برای تأیید حساب بررسی کن.",
          "success"
        );


        if (submitButton) {

          submitButton.disabled =
            false;


          submitButton.innerHTML =
            'ساخت حساب <span>←</span>';

        }


        return;

      }


      showAuthMessage(
        registerMessage,
        "حساب با موفقیت ساخته شد ✓",
        "success"
      );


      setTimeout(
        () => {

          closeAuthModal();

          updateAuthUI();

        },
        700
      );

    }
  );

}


// =========================
// FORGOT PASSWORD
// =========================

if (forgotPassword) {

  forgotPassword.addEventListener(
    "click",
    async () => {

      clearAuthMessages();


      const emailInput =
        document.getElementById(
          "loginEmail"
        );


      const email =
        emailInput?.value.trim();


      if (!email) {

        showAuthMessage(
          loginMessage,
          "اول ایمیلت رو وارد کن.",
          "error"
        );


        emailInput?.focus();


        return;

      }


      const {
        error
      } =
        await supabase.auth
          .resetPasswordForEmail(
            email,
            {
              redirectTo:
                `${window.location.origin}${window.location.pathname}`
            }
          );


      if (error) {

        console.error(
          "Password reset error:",
          error
        );


        showAuthMessage(
          loginMessage,
          "ارسال لینک بازیابی انجام نشد.",
          "error"
        );


        return;

      }


      showAuthMessage(
        loginMessage,
        "لینک بازیابی رمز عبور به ایمیلت ارسال شد.",
        "success"
      );

    }
  );

}


// =========================
// AUTH UI
// =========================

async function updateAuthUI() {

  try {

    const {
      data: {
        user
      }
    } =
      await supabase.auth.getUser();


    const loginButton =
      document.querySelector(
        ".nav-login"
      );


    if (!loginButton) {
      return;
    }


    if (user) {

      loginButton.textContent =
        "حساب من";


      loginButton.dataset.authenticated =
        "true";

    }

    else {

      loginButton.textContent =
        "ورود";


      loginButton.dataset.authenticated =
        "false";

    }

  }

  catch (error) {

    console.error(
      "Auth UI error:",
      error
    );

  }

}


// =========================
// AUTH STATE
// =========================

supabase.auth.onAuthStateChange(
  () => {

    updateAuthUI();

  }
);


// =========================
// INITIAL AUTH CHECK
// =========================

updateAuthUI();


// =========================
// UPLOAD BUTTONS
// =========================

document
  .querySelectorAll("[data-upload]")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        window.location.href =
          "upload.html";

      }
    );

  });


// =========================
// LOAD MORE
// =========================

if (loadMoreBtn) {

  loadMoreBtn.addEventListener(
    "click",
    async () => {

      if (
        !hasMoreAssets ||
        isLoadingAssets
      ) {

        return;

      }


      loadMoreBtn.disabled =
        true;


      loadMoreBtn.textContent =
        "در حال بارگذاری...";


      currentPage++;


      await loadAssets(
        false
      );


      loadMoreBtn.disabled =
        false;


      loadMoreBtn.textContent =
        "نمایش بیشتر";

    }
  );

}


// =========================
// SCROLL MOTION
// =========================

const scrollSections =
  document.querySelectorAll(
    ".section, .creator-cta, .footer"
  );


const scrollGrids =
  document.querySelectorAll(
    ".categories-grid, .asset-grid"
  );


scrollSections.forEach(
  section => {

    section.classList.add(
      "scroll-reveal"
    );

  }
);


scrollGrids.forEach(
  grid => {

    grid.classList.add(
      "scroll-grid"
    );

  }
);


const scrollMotionObserver =
  new IntersectionObserver(
    entries => {

      entries.forEach(
        entry => {

          if (
            entry.isIntersecting
          ) {

            entry.target.classList.add(
              "is-visible"
            );

          }

          else {

            entry.target.classList.remove(
              "is-visible"
            );

          }

        }
      );

    },
    {
      threshold: 0.15,
      rootMargin:
        "0px 0px -80px 0px"
    }
  );


document
  .querySelectorAll(
    ".scroll-reveal, .scroll-grid"
  )
  .forEach(
    element => {

      scrollMotionObserver.observe(
        element
      );

    }
  );


// =========================
// INITIAL LOAD
// =========================

loadAssets(
  true
);


console.log(
  "%cLoyalForge",
  "color:#ff6a00;font-size:20px;font-weight:bold"
);
