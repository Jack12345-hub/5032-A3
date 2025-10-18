<template>
  <!-- 跳过导航的快捷键（键盘用户 Tab 一下能直接跳到主内容） -->
  <a class="skip-link" href="#main-content">Skip to main content</a>

  <nav class="navbar navbar-dark bg-dark navbar-expand"
       role="navigation"
       aria-label="Main navigation">
    <div class="container">
      <RouterLink to="/" class="navbar-brand" aria-label="Go to Home">My Vue App</RouterLink>

      <button
        class="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#mainNav"
        aria-controls="mainNav"
        aria-expanded="false"
        aria-label="Toggle navigation menu"
      >
        <span class="navbar-toggler-icon" aria-hidden="true"></span>
      </button>

      <div id="mainNav" class="collapse navbar-collapse">
        <ul class="navbar-nav ms-auto" role="menubar" aria-label="Primary">
          <li class="nav-item" role="none">
            <RouterLink to="/" class="nav-link" role="menuitem">Home</RouterLink>
          </li>

          <li class="nav-item" role="none">
            <RouterLink to="/members" class="nav-link" role="menuitem" active-class="active">
              Members
            </RouterLink>
          </li>

          <li class="nav-item" role="none">
            <RouterLink to="/classes" class="nav-link" role="menuitem" active-class="active">
              Classes
            </RouterLink>
          </li>

          <li class="nav-item" role="none">
            <RouterLink to="/form" class="nav-link" role="menuitem">Form</RouterLink>
          </li>

          <li class="nav-item" role="none">
            <RouterLink to="/about" class="nav-link" role="menuitem">About</RouterLink>
          </li>

          <!-- Gym Map -->
          <li class="nav-item" role="none">
            <RouterLink to="/map"
                        class="nav-link"
                        role="menuitem"
                        aria-label="Open Gym Map showing nearby gyms"
                        active-class="active">
              🗺️ Gym Map
            </RouterLink>
          </li>

          <!-- 被你注释掉的菜单保持不变 -->
          <!-- ✅ 暂时隐藏 Add Book、Book Counter、API 等导航项 -->
<!--
<li class="nav-item">
  <RouterLink to="/addbook" class="nav-link" active-class="active">
    Add Book
  </RouterLink>
</li>

<li class="nav-item">
  <RouterLink to="/GetBookCount" class="nav-link" active-class="active">
    Book Counter
  </RouterLink>
</li>

<li class="nav-item">
  <router-link to="/GetBookCount" class="nav-link" active-class="active">
    Get Book Count
  </router-link>
</li>

<li class="nav-item">
  <router-link to="/WeatherCheck" class="nav-link" active-class="active">
    Get Weather
  </router-link>
</li>

<li class="nav-item">
  <router-link to="/CountBookAPI" class="nav-link" active-class="active">
    Count Book API
  </router-link>
</li>

<li class="nav-item">
  <router-link to="/GetAllBookAPI" class="nav-link" active-class="active">
    Get All Book API
  </router-link>
</li>
-->

// NavBar.vue 增加
<li class="nav-item">
  <RouterLink to="/book" class="nav-link">Book</RouterLink>
</li>    

<li class="nav-item">
  <RouterLink to="/analytics" class="nav-link">Analytics</RouterLink>
</li>

<li class="nav-item" role="none">
            <RouterLink class="nav-link" :to="{ name: 'email-test' }" role="menuitem">
              Email Test
            </RouterLink>
          </li>

          <!-- 登录/注册 -->
          <li class="nav-item" v-if="!session.isAuthed" role="none">
            <RouterLink to="/firelogin" class="nav-link" role="menuitem">Login</RouterLink>
          </li>
          <li class="nav-item" v-if="!session.isAuthed" role="none">
            <RouterLink to="/fireregister" class="nav-link" role="menuitem">Register</RouterLink>
          </li>

          <!-- Admin -->
          <li class="nav-item" v-if="session.isAdmin" role="none">
            <RouterLink to="/admin" class="nav-link" role="menuitem">Admin</RouterLink>
          </li>

          <!-- 已登录状态 -->
          <li class="nav-item d-flex align-items-center" v-if="session.isAuthed" role="none">
            <span class="navbar-text small me-2" aria-live="polite">
              {{ session.profile?.email || session.user?.email }}
            </span>
            <button class="btn btn-sm btn-outline-light"
                    type="button"
                    @click="doLogout">
              Logout
            </button>
          </li>
        </ul>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { useRouter } from "vue-router";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { session } from "../store/session";

const router = useRouter();
async function doLogout() {
  try { await signOut(auth); } catch (e) { console.error("signOut failed:", e); }
  finally {
    session.user = null;
    session.profile = null;
    router.push("/firelogin");
  }
}
</script>

<style scoped>
/* 可见的键盘焦点（WCAG 2.4.7） */
.nav-link:focus, .navbar-brand:focus, .btn:focus, .navbar-toggler:focus {
  outline: 3px solid #ffc107; /* 高对比黄色 */
  outline-offset: 2px;
}

/* 跳过链接（WCAG 2.4.1） */
.skip-link {
  position: absolute;
  left: -9999px;
  top: 0;
  background: #000;
  color: #fff;
  padding: 8px 12px;
  z-index: 1000;
}
.skip-link:focus {
  left: 8px;
  border-radius: 6px;
}
</style>
