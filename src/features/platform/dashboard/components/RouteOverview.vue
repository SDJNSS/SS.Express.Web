<script setup lang="ts">
import mapImage from '@/assets/images/china-logistics-map.png'
</script>

<template>
  <div class="route-overview">
    <div class="route-overview__legend">
      <span><i class="legend-line legend-line--blue" />已完成</span>
      <span><i class="legend-line legend-line--green" />运输中</span>
      <span><i class="legend-line legend-line--orange" />待发运</span>
    </div>
    <div class="route-overview__map">
      <img :src="mapImage" alt="中国物流线路底图" />
      <svg
        class="route-overview__routes"
        viewBox="0 0 800 260"
        role="img"
        aria-label="成都经西安、郑州到上海的运输线路"
      >
        <path class="route route--blue" d="M160 198 C235 175 260 120 360 125" />
        <path class="route route--green" d="M360 125 C435 158 485 98 545 112" />
        <path class="route route--orange" d="M545 112 C630 108 660 150 715 170" />
      </svg>
      <span class="city city--chengdu"><i />成都</span>
      <span class="city city--xian"><i />西安</span>
      <span class="city city--zhengzhou"><i />郑州</span>
      <span class="city city--shanghai"><i />上海</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
.route-overview {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.route-overview__legend {
  display: flex;
  gap: var(--spacing-5);
  padding: 0 var(--spacing-5);
  color: var(--text-secondary);
  font-size: var(--font-size-xs);

  span {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
  }
}

.legend-line {
  display: inline-block;
  width: 20px;
  border-top: 2px solid;
}

.legend-line--blue {
  color: var(--color-primary);
}
.legend-line--green {
  color: var(--color-success);
  border-top-style: dashed;
}
.legend-line--orange {
  color: var(--color-warning);
  border-top-style: dashed;
}

.route-overview__map {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;

  img {
    position: absolute;
    inset: 2% 5% 0;
    width: 90%;
    height: 98%;
    object-fit: contain;
    opacity: 0.94;
  }
}

.route-overview__routes {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.route {
  fill: none;
  stroke-width: 3;
  stroke-linecap: round;
}

.route--blue {
  stroke: var(--color-primary);
}
.route--green {
  stroke: var(--color-success);
  stroke-dasharray: 9 7;
}
.route--orange {
  stroke: var(--color-warning);
  stroke-dasharray: 9 7;
}

.city {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-1);
  color: var(--text-primary);
  font-size: var(--font-size-xs);
  font-weight: 600;

  i {
    width: 11px;
    height: 11px;
    background: var(--background-card);
    border: 3px solid var(--color-primary);
    border-radius: 50%;
    box-shadow: var(--shadow-route-marker);
  }
}

.city--chengdu {
  left: 18%;
  top: 72%;
}
.city--xian {
  left: 43%;
  top: 45%;
}
.city--zhengzhou {
  left: 64%;
  top: 40%;
}
.city--shanghai {
  right: 8%;
  top: 60%;
}
.city--shanghai i {
  border-color: var(--color-warning);
}
</style>
