const translations = {
  en: {
    title: "Commercial sign in",
    language: "Language",
    lead: "Sign in with the BossAI commercial account that owns this proprietary BossAI Funding entitlement.",
    privacy: "Your financing records stay on this device. Sign-in sends only commercial account credentials and product/install identifiers to BossAI Headquarters Commerce.",
    identifier: "Phone or email",
    password: "Password",
    signIn: "Sign in",
    cancel: "Cancel",
    mfaTitle: "Verify your account",
    mfaLead: "Enter either your 6-digit authenticator code or one unused recovery code.",
    authCode: "Authenticator code",
    recoveryCode: "Recovery code",
    or: "or",
    verify: "Verify",
    community: "The AGPL Community edition does not require this proprietary commercial sign-in.",
    signingIn: "Signing in…",
    verifying: "Verifying…",
  },
  "zh-CN": {
    title: "商业版登录",
    language: "语言",
    lead: "使用拥有 BossAI Funding 商业授权的 BossAI 商业账号登录。",
    privacy: "融资数据保留在本机。登录只会向 BossAI Headquarters Commerce 发送商业账号凭据以及产品/安装标识。",
    identifier: "手机号或邮箱",
    password: "密码",
    signIn: "登录",
    cancel: "取消",
    mfaTitle: "验证账号",
    mfaLead: "请输入 6 位身份验证器代码，或一个尚未使用的恢复代码。",
    authCode: "身份验证器代码",
    recoveryCode: "恢复代码",
    or: "或",
    verify: "验证",
    community: "AGPL Community 版本不需要此商业版登录。",
    signingIn: "正在登录…",
    verifying: "正在验证…",
  },
  "zh-TW": {
    title: "商業版登入",
    language: "語言",
    lead: "使用擁有 BossAI Funding 商業授權的 BossAI 商業帳號登入。",
    privacy: "融資資料保留在本機。登入只會向 BossAI Headquarters Commerce 傳送商業帳號憑證以及產品/安裝識別。",
    identifier: "手機號碼或電子郵件",
    password: "密碼",
    signIn: "登入",
    cancel: "取消",
    mfaTitle: "驗證帳號",
    mfaLead: "請輸入 6 位驗證器代碼，或一個尚未使用的恢復代碼。",
    authCode: "驗證器代碼",
    recoveryCode: "恢復代碼",
    or: "或",
    verify: "驗證",
    community: "AGPL Community 版本不需要此商業版登入。",
    signingIn: "正在登入…",
    verifying: "正在驗證…",
  },
  es: {
    title: "Inicio de sesión comercial",
    language: "Idioma",
    lead: "Inicia sesión con la cuenta comercial de BossAI que posee esta autorización propietaria de BossAI Funding.",
    privacy: "Tus datos de financiación permanecen en este dispositivo. El inicio de sesión solo envía credenciales comerciales e identificadores de producto/instalación a BossAI Headquarters Commerce.",
    identifier: "Teléfono o correo electrónico",
    password: "Contraseña",
    signIn: "Iniciar sesión",
    cancel: "Cancelar",
    mfaTitle: "Verifica tu cuenta",
    mfaLead: "Introduce el código de 6 dígitos del autenticador o un código de recuperación sin usar.",
    authCode: "Código del autenticador",
    recoveryCode: "Código de recuperación",
    or: "o",
    verify: "Verificar",
    community: "La edición Community bajo AGPL no requiere este inicio de sesión comercial propietario.",
    signingIn: "Iniciando sesión…",
    verifying: "Verificando…",
  },
};

const localeSelect = document.querySelector("#commercial-login-locale");
const loginPanel = document.querySelector("#login-panel");
const mfaPanel = document.querySelector("#mfa-panel");
const loginForm = document.querySelector("#commercial-login-form");
const mfaForm = document.querySelector("#commercial-mfa-form");
const identifierInput = document.querySelector("#commercial-login-identifier");
const passwordInput = document.querySelector("#commercial-login-password");
const mfaCodeInput = document.querySelector("#commercial-mfa-code");
const mfaRecoveryInput = document.querySelector("#commercial-mfa-recovery");
const loginError = document.querySelector("#commercial-login-error");
const mfaError = document.querySelector("#commercial-mfa-error");
const loginSubmit = document.querySelector("#commercial-login-submit");
const mfaSubmit = document.querySelector("#commercial-mfa-submit");

function currentMessages() {
  return translations[localeSelect.value] ?? translations.en;
}

function applyLocale() {
  const locale = translations[localeSelect.value] ? localeSelect.value : "en";
  document.documentElement.lang = locale;
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.getAttribute("data-i18n");
    const message = translations[locale]?.[key] ?? translations.en[key];
    if (message) element.textContent = message;
  });
}

function setBusy(button, busy, messageKey, normalKey) {
  button.disabled = busy;
  button.textContent = currentMessages()[busy ? messageKey : normalKey];
}

function showError(target, result) {
  target.textContent = result?.message || "BossAI commercial account verification failed.";
}

localeSelect.addEventListener("change", applyLocale);
applyLocale();
identifierInput.focus();

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginError.textContent = "";
  setBusy(loginSubmit, true, "signingIn", "signIn");
  try {
    const result = await window.bossaiCommercialAuth.login({
      identifier: identifierInput.value,
      password: passwordInput.value,
    });
    passwordInput.value = "";
    if (!result?.ok) {
      showError(loginError, result);
      return;
    }
    if (result.mfaRequired) {
      loginPanel.hidden = true;
      mfaPanel.hidden = false;
      mfaCodeInput.focus();
    }
  } catch {
    showError(loginError, null);
  } finally {
    setBusy(loginSubmit, false, "signingIn", "signIn");
  }
});

mfaForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  mfaError.textContent = "";
  setBusy(mfaSubmit, true, "verifying", "verify");
  try {
    const result = await window.bossaiCommercialAuth.confirmMfa({
      code: mfaCodeInput.value,
      recoveryCode: mfaRecoveryInput.value,
    });
    mfaCodeInput.value = "";
    mfaRecoveryInput.value = "";
    if (!result?.ok) showError(mfaError, result);
  } catch {
    showError(mfaError, null);
  } finally {
    setBusy(mfaSubmit, false, "verifying", "verify");
  }
});

document.querySelectorAll("[data-cancel]").forEach((button) => {
  button.addEventListener("click", () => window.bossaiCommercialAuth.cancel());
});
