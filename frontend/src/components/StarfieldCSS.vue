<template>
  <div class="starfield-css" :class="{ 'reduced-motion': prefersReducedMotion }">
    <div class="origin">
      <div class="control">
        <div class="galaxy">
          <div
            class="star"
            v-for="n in 200"
            :key="n"
            :style="getStarStyle(n)"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';

export default {
  name: 'StarfieldCSS',
  props: {
    enabled: {
      type: Boolean,
      default: true
    }
  },
  setup() {
    const prefersReducedMotion = ref(false);

    const checkMotionPreference = () => {
      if (typeof window !== 'undefined') {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        prefersReducedMotion.value = mediaQuery.matches;
        
        mediaQuery.addEventListener('change', (e) => {
          prefersReducedMotion.value = e.matches;
        });
      }
    };

    const getStarStyle = (n) => {
      // 为第21颗星星之后生成随机样式
      if (n > 20) {
        const colors = [
          '#ffffff', '#fff299', '#8380f5', '#f2eda3', '#722b83',
          '#eee784', '#642674', '#5a2268', '#6b297c', '#ff5880',
          '#6c69f3', '#8df48e', '#13a9e9', '#12a2e0', '#ea1b90',
          '#dd1486', '#f4efb0', '#f46f6f', '#ffcc99', '#99ccff'
        ];

        const size = 0.3 + Math.random() * 0.5;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const shadowSize = size * (0.5 + Math.random() * 0.8);
        const shadowSpread = size * (0.1 + Math.random() * 0.3);

        const rotX = Math.floor(Math.random() * 360);
        const rotY = Math.floor(Math.random() * 360);
        const rotZ = Math.floor(Math.random() * 360);
        const translateZ = 60 + Math.random() * 40;

        return {
          '--size': `${size}vmin`,
          '--background': color,
          '--shadow': `0 0 ${shadowSize}vmin ${shadowSpread}vmin ${color}`,
          '--transform': `rotate3d(1, 0, 0, ${rotX}deg) rotate3d(0, 1, 0, ${rotY}deg) rotate3d(0, 0, 1, ${rotZ}deg) translate3d(0, 0, ${translateZ}vmin)`
        };
      }
      return {};
    };

    onMounted(() => {
      checkMotionPreference();
    });

    return {
      prefersReducedMotion,
      getStarStyle
    };
  }
};
</script>

<style>
/* 基础重置和布局 */
.starfield-css {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  pointer-events: none;
  z-index: -1;
  background: #0e0220; /* 保持原有的深紫色背景 */
  perspective: 150vmin;
}

.starfield-css.reduced-motion {
  display: none;
}

.origin,
.control,
.galaxy,
.star {
  position: absolute;
  transform-style: preserve-3d;
}

.origin {
  top: 50%;
  left: 50%;
  transform: translate3d(-50%, -50%, 0vmin);
}

.control {
  transform: scale3d(0, 0, 0);
  animation: appear 10s linear forwards;
}

.galaxy {
  display: flex;
  align-items: center;
  justify-content: center;
  animation: rotation 30s linear infinite;
  transform-origin: center center;
}

.star, .star::before, .star::after {
  position: absolute;
  transform-style: preserve-3d;
}

.star::before, .star::after {
  background: var(--background);
  border-radius: 50%;
  box-shadow: var(--shadow);
  content: '';
  height: var(--size);
  width: var(--size);
}

.star::before {
  transform: var(--transform);
}

.star::after {
  transform: scale3d(-1, -1, -1) var(--transform);
}

/* 动画定义 */
@keyframes appear {
  to {
    transform: scale3d(0.8, 0.8, 0.8);
  }
}

@keyframes rotation {
  to {
    transform: rotate3d(0, 1, 0, 360deg);
  }
}

/* 星星样式定义 */
.star:nth-of-type(1) {
  --size: 0.2835921021vmin;
  --background: #642674;
  --shadow: 0 0 0.1750153474vmin 0.0363164749vmin #642674;
  --transform: rotate3d(1, 0, 0, 328deg) rotate3d(0, 1, 0, 135deg) rotate3d(0, 0, 1, 96deg) translate3d(0, 0, 82.541015291vmin);
}

.star:nth-of-type(2) {
  --size: 0.7413082831vmin;
  --background: #fff299;
  --shadow: 0 0 0.6505248375vmin 0.3246593503vmin #fff4ad;
  --transform: rotate3d(1, 0, 0, 172deg) rotate3d(0, 1, 0, 111deg) rotate3d(0, 0, 1, 130deg) translate3d(0, 0, 87.5727103039vmin);
}

.star:nth-of-type(3) {
  --size: 0.4260554564vmin;
  --background: #8380f5;
  --shadow: 0 0 0.5861517082vmin 0.2004683041vmin #8380f5;
  --transform: rotate3d(1, 0, 0, 250deg) rotate3d(0, 1, 0, 310deg) rotate3d(0, 0, 1, 317deg) translate3d(0, 0, 78.8602777857vmin);
}

.star:nth-of-type(4) {
  --size: 0.7103443369vmin;
  --background: #f2eda3;
  --shadow: 0 0 0.7010757604vmin 0.2007248801vmin #f2eda3;
  --transform: rotate3d(1, 0, 0, 69deg) rotate3d(0, 1, 0, 100deg) rotate3d(0, 0, 1, 83deg) translate3d(0, 0, 87.0936338506vmin);
}

.star:nth-of-type(5) {
  --size: 0.663428383vmin;
  --background: #722b83;
  --shadow: 0 0 0.80461304vmin 0.2224569914vmin #722b83;
  --transform: rotate3d(1, 0, 0, 5deg) rotate3d(0, 1, 0, 265deg) rotate3d(0, 0, 1, 118deg) translate3d(0, 0, 88.4998499479vmin);
}

.star:nth-of-type(6) {
  --size: 0.7176506352vmin;
  --background: #eee784;
  --shadow: 0 0 0.3877486259vmin 0.3321995916vmin #f4efb0;
  --transform: rotate3d(1, 0, 0, 91deg) rotate3d(0, 1, 0, 309deg) rotate3d(0, 0, 1, 358deg) translate3d(0, 0, 89.2378760161vmin);
}

.star:nth-of-type(7) {
  --size: 0.310865557vmin;
  --background: #642674;
  --shadow: 0 0 0.3792362228vmin 0.0753154867vmin #642674;
  --transform: rotate3d(1, 0, 0, 315deg) rotate3d(0, 1, 0, 109deg) rotate3d(0, 0, 1, 267deg) translate3d(0, 0, 86.8954812814vmin);
}

.star:nth-of-type(8) {
  --size: 0.7206382278vmin;
  --background: #5a2268;
  --shadow: 0 0 0.4802848584vmin 0.3214256666vmin #682878;
  --transform: rotate3d(1, 0, 0, 331deg) rotate3d(0, 1, 0, 113deg) rotate3d(0, 0, 1, 309deg) translate3d(0, 0, 71.2468353149vmin);
}

.star:nth-of-type(9) {
  --size: 0.424013172vmin;
  --background: #6b297c;
  --shadow: 0 0 0.4529582791vmin 0.0383392416vmin #6b297c;
  --transform: rotate3d(1, 0, 0, 223deg) rotate3d(0, 1, 0, 352deg) rotate3d(0, 0, 1, 277deg) translate3d(0, 0, 79.1411897476vmin);
}

.star:nth-of-type(10) {
  --size: 0.7107513334vmin;
  --background: #ff5880;
  --shadow: 0 0 0.9962013414vmin 0.1962571025vmin #ff5880;
  --transform: rotate3d(1, 0, 0, 101deg) rotate3d(0, 1, 0, 107deg) rotate3d(0, 0, 1, 16deg) translate3d(0, 0, 70.1759644933vmin);
}

.star:nth-of-type(11) {
  --size: 0.5707603905vmin;
  --background: #6b297c;
  --shadow: 0 0 0.3749602159vmin 0.200128313vmin #6b297c;
  --transform: rotate3d(1, 0, 0, 243deg) rotate3d(0, 1, 0, 77deg) rotate3d(0, 0, 1, 193deg) translate3d(0, 0, 71.7100001416vmin);
}

.star:nth-of-type(12) {
  --size: 0.5798447244vmin;
  --background: #6c69f3;
  --shadow: 0 0 0.5713127208vmin 0.1327069878vmin #7e7bf5;
  --transform: rotate3d(1, 0, 0, 205deg) rotate3d(0, 1, 0, 54deg) rotate3d(0, 0, 1, 42deg) translate3d(0, 0, 80.4488561184vmin);
}

.star:nth-of-type(13) {
  --size: 0.677564678vmin;
  --background: #8df48e;
  --shadow: 0 0 0.3432892544vmin 0.1001157273vmin #bbf8bc;
  --transform: rotate3d(1, 0, 0, 120deg) rotate3d(0, 1, 0, 110deg) rotate3d(0, 0, 1, 201deg) translate3d(0, 0, 82.7612765812vmin);
}

.star:nth-of-type(14) {
  --size: 0.4961091404vmin;
  --background: #13a9e9;
  --shadow: 0 0 0.4328784371vmin 0.2340385488vmin #2cb4ee;
  --transform: rotate3d(1, 0, 0, 357deg) rotate3d(0, 1, 0, 143deg) rotate3d(0, 0, 1, 266deg) translate3d(0, 0, 78.8844240801vmin);
}

.star:nth-of-type(15) {
  --size: 0.4095470191vmin;
  --background: #12a2e0;
  --shadow: 0 0 0.5125966447vmin 0.0001667585vmin #36b7ef;
  --transform: rotate3d(1, 0, 0, 359deg) rotate3d(0, 1, 0, 298deg) rotate3d(0, 0, 1, 311deg) translate3d(0, 0, 76.3303084405vmin);
}

.star:nth-of-type(16) {
  --size: 0.7408991482vmin;
  --background: #ea1b90;
  --shadow: 0 0 0.5636452941vmin 0.3366402359vmin #ea1b90;
  --transform: rotate3d(1, 0, 0, 54deg) rotate3d(0, 1, 0, 19deg) rotate3d(0, 0, 1, 167deg) translate3d(0, 0, 70.4007677602vmin);
}

.star:nth-of-type(17) {
  --size: 0.5275932186vmin;
  --background: #dd1486;
  --shadow: 0 0 0.3797963007vmin 0.1531168848vmin #eb2495;
  --transform: rotate3d(1, 0, 0, 178deg) rotate3d(0, 1, 0, 222deg) rotate3d(0, 0, 1, 277deg) translate3d(0, 0, 72.288528018vmin);
}

.star:nth-of-type(18) {
  --size: 0.5093118435vmin;
  --background: #ea1b90;
  --shadow: 0 0 0.3970329884vmin 0.0773944724vmin #ea1b90;
  --transform: rotate3d(1, 0, 0, 268deg) rotate3d(0, 1, 0, 327deg) rotate3d(0, 0, 1, 46deg) translate3d(0, 0, 76.8482204992vmin);
}

.star:nth-of-type(19) {
  --size: 0.6952201696vmin;
  --background: #f4efb0;
  --shadow: 0 0 0.5488628261vmin 0.0060727272vmin #f4efb0;
  --transform: rotate3d(1, 0, 0, 51deg) rotate3d(0, 1, 0, 92deg) rotate3d(0, 0, 1, 131deg) translate3d(0, 0, 76.3199369121vmin);
}

.star:nth-of-type(20) {
  --size: 0.6499208005vmin;
  --background: #f46f6f;
  --shadow: 0 0 0.8953697874vmin 0.0508831665vmin #f89f9f;
  --transform: rotate3d(1, 0, 0, 247deg) rotate3d(0, 1, 0, 336deg) rotate3d(0, 0, 1, 52deg) translate3d(0, 0, 75.7195953194vmin);
}


</style>
