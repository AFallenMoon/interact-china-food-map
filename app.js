// ========== 全局变量 ==========
let foods = [];
let provinces = [];
let chinaMapChart = null;
let knowledgeGraphChart = null;
let tasteChart = null;
let ingredientWordCloudChart = null;
let timeChart = null;
let activeProvinceCodes = new Set(); // 支持多选
let lastSelectedProvinceCode = null; // 记录最后选中的省份
let keyword = '';

// 节点类型配置（颜色确保无重复且具有高区分度）
// 节点大小：美食最大（中心节点），口味其次，食材最小
const nodeTypeConfig = {
  food: { color: '#3B82F6', size: 43, category: 0, name: '美食' },          // 亮蓝色 - 核心节点（最大，必选）
  taste: { color: '#FF6B35', size: 35, category: 1, name: '口味' },          // 亮橙色 - 属性节点（中等）
  ingredient: { color: '#EC4899', size: 25, category: 2, name: '食材' },    // 粉红色 - 属性节点（最小）
};


// 默认只显示美食和口味，食材为可选项
let visibleNodeTypes = new Set(['food', 'taste']);

// ========== 数据加载 ==========
async function loadData() {
  try {
    const [foodsRes, provincesRes] = await Promise.all([
      fetch('data/foods.json'),
      fetch('data/provinces.json'),
    ]);
    foods = await foodsRes.json();
    provinces = await provincesRes.json();
    // 直接初始化完整功能，不使用预览
    await initChinaMap();
    // 根据默认视图显示内容
    if (currentView === 'detail') {
      renderFoodDetail(foods);
    } else {
      updateKnowledgeGraph(foods);
    }
  } catch (err) {
    console.error('加载数据失败:', err);
  }
}

// ========== 更新标记点样式 ==========
function updateMarkerStyles() {
  if (!chinaMapChart) return;
  
  const smallAreaMarkers = [
    { name: '香港特别行政区', coord: [114.25, 22.35] },
    { name: '澳门特别行政区', coord: [113.45, 22.10] },
  ];
  
  const markerData = smallAreaMarkers.map(marker => {
    const province = provinces.find(p => p.name === marker.name);
    const isSelected = province && activeProvinceCodes.has(province.code);
    return {
      name: marker.name,
      value: marker.coord,
      itemStyle: isSelected ? {
        color: '#EFF6FF',
        borderColor: '#3B82F6',
        borderWidth: 2,
        shadowBlur: 12,
        shadowColor: 'rgba(59, 130, 246, 0.3)',
      } : {
        color: '#E2E8F0',
        borderColor: '#CBD5E1',
        borderWidth: 1.5,
        shadowBlur: 4,
        shadowColor: 'rgba(0, 0, 0, 0.1)',
      },
      symbolSize: isSelected ? 10 : 8,
    };
  });
  
  // 更新 scatter 系列的数据（series[1]）
  chinaMapChart.setOption({
    series: [{
      // 第一个 series 是 map，保持不变
    }, {
      // 第二个 series 是 scatter，更新数据
      data: markerData,
    }]
  }, false);
}

// ========== 中国地图初始化 ==========
async function initChinaMap() {
  const mapEl = document.getElementById('chinaMap');
  const fallback = document.getElementById('chinaMapFallback');

  if (!mapEl || !window.echarts) {
    if (fallback) fallback.classList.remove('hidden');
    return;
  }

  if (!echarts.getMap('china')) {
    try {
      // 优先从本地加载地图数据，避免 GitHub Pages 上的 CORS 问题
      let resp = await fetch('data/china.json');
      
      // 如果本地文件不存在，尝试从外部 API 加载
      if (!resp.ok) {
        resp = await fetch('https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json');
      }
      
      if (!resp.ok) throw new Error('加载失败');
      const geoJson = await resp.json();
      echarts.registerMap('china', geoJson);
    } catch (e) {
      console.error('加载地图数据失败:', e);
      if (fallback) fallback.classList.remove('hidden');
      return;
    }
  }

  try {
    chinaMapChart = echarts.init(mapEl);
    
    const provinceData = provinces.map(p => {
      const count = foods.filter(f => f.province_code === p.code).length;
      return { name: p.name, value: count };
    });

    // 小面积地区的坐标和标记点配置（用于增加点击区域）
    const smallAreaMarkers = [
      { name: '香港特别行政区', coord: [114.25, 22.35] },
      { name: '澳门特别行政区', coord: [113.45, 22.10] },
    ];

    // 检测是否为移动设备
    const isMobile = window.innerWidth < 768;
    
    const option = {
      backgroundColor: 'transparent',
      geo: {
        map: 'china',
        roam: true,
        zoom: isMobile ? 1.2 : 1.5,
        center: [105, 36],
        selectedMode: 'multiple',
        itemStyle: {
          areaColor: '#F8FAFC',
          borderColor: '#E2E8F0',
          borderWidth: 1,
        },
        emphasis: {
          disabled: false,
          itemStyle: {
            areaColor: '#EFF6FF',
            borderColor: '#3B82F6',
            borderWidth: 2,
            shadowBlur: 12,
            shadowColor: 'rgba(59, 130, 246, 0.3)',
          },
          label: {
            show: false,
          },
        },
        select: {
          disabled: false,
          itemStyle: {
            areaColor: '#EFF6FF',
            borderColor: '#3B82F6',
            borderWidth: 2,
            shadowBlur: 12,
            shadowColor: 'rgba(59, 130, 246, 0.3)',
          },
          label: {
            show: false,
          },
        },
        blur: {
          itemStyle: {
            areaColor: '#F8FAFC',
            borderColor: '#E2E8F0',
            borderWidth: 1,
          },
        },
        label: {
          show: false,
        },
      },
      series: [
        {
          type: 'map',
          map: 'china',
          geoIndex: 0,
          data: provinceData,
          selectedMode: 'multiple',
          itemStyle: {
            areaColor: '#F8FAFC',
            borderColor: '#E2E8F0',
            borderWidth: 1,
          },
          emphasis: {
            disabled: false,
            itemStyle: {
              areaColor: '#EFF6FF',
              borderColor: '#3B82F6',
              borderWidth: 2,
              shadowBlur: 12,
              shadowColor: 'rgba(59, 130, 246, 0.3)',
            },
            label: {
              show: false,
            },
          },
          select: {
            disabled: false,
            itemStyle: {
              areaColor: '#EFF6FF',
              borderColor: '#3B82F6',
              borderWidth: 2,
              shadowBlur: 12,
              shadowColor: 'rgba(59, 130, 246, 0.3)',
            },
            label: {
              show: false,
            },
          },
          blur: {
            itemStyle: {
              areaColor: '#F8FAFC',
              borderColor: '#E2E8F0',
              borderWidth: 1,
            },
          },
          label: {
            show: false,
          },
        },
        // 为小面积地区添加可点击的标记点
        {
          type: 'scatter',
          coordinateSystem: 'geo',
          data: smallAreaMarkers.map(marker => {
            const province = provinces.find(p => p.name === marker.name);
            const isSelected = province && activeProvinceCodes.has(province.code);
            return {
              name: marker.name,
              value: marker.coord,
              itemStyle: isSelected ? {
                color: '#EFF6FF',
                borderColor: '#3B82F6',
                borderWidth: 2,
                shadowBlur: 12,
                shadowColor: 'rgba(59, 130, 246, 0.3)',
              } : {
                color: '#E2E8F0',
                borderColor: '#CBD5E1',
                borderWidth: 1.5,
                shadowBlur: 4,
                shadowColor: 'rgba(0, 0, 0, 0.1)',
              },
              symbolSize: isSelected ? 10 : 8,
            };
          }),
          itemStyle: {
            color: '#E2E8F0',
            borderColor: '#CBD5E1',
            borderWidth: 1.5,
            shadowBlur: 4,
            shadowColor: 'rgba(0, 0, 0, 0.1)',
          },
          emphasis: {
            itemStyle: {
              color: '#EFF6FF',
              borderColor: '#3B82F6',
              borderWidth: 2,
              shadowBlur: 8,
              shadowColor: 'rgba(59, 130, 246, 0.3)',
            },
            symbolSize: 10,
          },
          label: {
            show: false, // 不显示标签，保持简洁
          },
          zlevel: 10, // 确保标记点在地图上方
        },
      ],
      tooltip: {
        show: false,
      },
    };

    chinaMapChart.setOption(option);

    window.addEventListener('resize', () => {
      // 延迟执行resize，确保布局完成后再调整
      setTimeout(() => {
        chinaMapChart && chinaMapChart.resize();
        knowledgeGraphChart && knowledgeGraphChart.resize();
        tasteChart && tasteChart.resize();
        ingredientWordCloudChart && ingredientWordCloudChart.resize();
        timeChart && timeChart.resize();
      }, 100);
    });

    let currentHoverProvinceCode = null;
    let hoverTimeout = null;
    
    chinaMapChart.on('mouseover', (params) => {
      // 支持地图区域和标记点的悬停
      if (params.seriesType !== 'map' && params.seriesType !== 'scatter') return;
      const province = provinces.find(p => p.name === params.name);
      if (!province) return;
      
      currentHoverProvinceCode = province.code;
      
      // 清除之前的延迟
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
      }
      
      // 延迟更新详情，避免频繁切换
      hoverTimeout = setTimeout(() => {
        // 临时更新详情和图谱（不改变 activeProvinceCodes）
        updateDetailOnHover(province.code);
      }, 150);
    });

    chinaMapChart.on('globalout', () => {
      currentHoverProvinceCode = null;
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
      }
      
      // 恢复显示当前选中的省份（如果有），否则显示所有数据
      // 注意：悬停时不改变选中状态，只临时更新显示
      if (activeProvinceCodes.size > 0) {
        applyFilters();
      } else {
        // 如果没有选中，显示所有数据
        if (currentView === 'detail') {
          renderFoodDetail(foods);
        } else {
          updateKnowledgeGraph(foods);
        }
      }
    });

    // 地图点击选择（支持多选）- 支持地图区域和标记点点击
    chinaMapChart.on('click', (params) => {
      // 支持点击地图区域和标记点
      if (params.seriesType !== 'map' && params.seriesType !== 'scatter') return;
      
      const province = provinces.find(p => p.name === params.name);
      if (!province) return;
      
      // 切换选中状态：如果点击的是已选中的省份，则取消选中；否则添加到选中列表
      if (activeProvinceCodes.has(province.code)) {
        activeProvinceCodes.delete(province.code);
        // 如果取消的是最后选中的省份，更新最后选中的省份
        if (lastSelectedProvinceCode === province.code) {
          // 从剩余选中的省份中选择最后一个（如果有的话）
          const remainingCodes = Array.from(activeProvinceCodes);
          lastSelectedProvinceCode = remainingCodes.length > 0 ? remainingCodes[remainingCodes.length - 1] : null;
        }
        // 取消选中状态
        if (params.seriesType === 'map') {
          chinaMapChart.dispatchAction({
            type: 'unselect',
            name: params.name
          });
        }
      } else {
        activeProvinceCodes.add(province.code);
        lastSelectedProvinceCode = province.code; // 记录最后选中的省份
        // 选中当前省份
        if (params.seriesType === 'map') {
          chinaMapChart.dispatchAction({
            type: 'select',
            name: params.name
          });
        }
      }
      
      // 如果是标记点，需要手动更新标记点的样式
      if (params.seriesType === 'scatter') {
        updateMarkerStyles();
      }
      
      // 更新详情和图谱
      applyFilters();
    });

  } catch (e) {
    console.error('初始化地图失败:', e);
    if (fallback) fallback.classList.remove('hidden');
  }
}

// ========== 美食详情展示 ==========
function renderFoodDetail(list) {
  const detailEl = document.getElementById('foodDetail');
  if (!detailEl) return;

  if (list.length === 0) {
    detailEl.innerHTML = `
      <div class="flex flex-col items-center justify-center py-12 sm:py-16 text-center">
        <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-100 flex items-center justify-center mb-3 sm:mb-4">
          <svg class="w-8 h-8 sm:w-10 sm:h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <p class="text-xs sm:text-sm text-slate-600 font-medium">暂无符合条件的美食</p>
        <p class="text-[10px] sm:text-xs text-slate-400 mt-2">请点击地图上的省份查看美食</p>
      </div>
    `;
    return;
  }

  const food = list[0];
  const province = provinces.find(p => p.code === food.province_code);

  // 直接在主页面显示完整详情，所有信息叠加在图片上
  detailEl.innerHTML = `
    <div class="relative w-full h-full rounded-xl overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 group">
      <img src="${food.image}" alt="${food.name}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Crect fill=%22%23f1f5f9%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%22 y=%2250%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%2394a3b8%22 font-size=%2214%22%3E暂无图片%3C/text%3E%3C/svg%3E'" />
      <div class="absolute inset-0 bg-gradient-to-t from-slate-900/75 via-slate-900/50 to-slate-900/20"></div>
      
      <!-- 所有内容叠加在图片上 -->
      <div class="absolute inset-0 flex flex-col justify-between p-3 sm:p-5">
        <!-- 顶部：左侧省份和菜系标签，右侧口味标签 -->
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <span class="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg bg-white/25 backdrop-blur-sm text-white text-[10px] sm:text-xs font-medium border border-white/30">${province?.name || ''}</span>
            <span class="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg bg-white/25 backdrop-blur-sm text-white text-[10px] sm:text-xs font-medium border border-white/30">${food.cuisine || ''}</span>
          </div>
          <!-- 口味标签在右上角 -->
          <div class="flex flex-wrap gap-1 sm:gap-1.5 justify-end max-w-[50%]">
            ${(food.taste_tags || []).map(t => 
              `<span class="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg bg-white/25 backdrop-blur-sm text-white text-[10px] sm:text-xs font-medium border border-white/30 drop-shadow-sm">${t}</span>`
            ).join('')}
          </div>
        </div>
        
        <!-- 底部：详细信息 -->
        <div class="space-y-2 sm:space-y-4">
          <!-- 标题 -->
          <h3 class="text-lg sm:text-2xl font-bold text-white drop-shadow-lg mb-1 sm:mb-2">${food.name}</h3>
          
          <!-- 简介：直接显示，无标题和缩进 -->
          <p class="text-xs sm:text-sm text-white/95 leading-relaxed drop-shadow-md mb-2 sm:mb-3 line-clamp-3 sm:line-clamp-none">${food.description || ''}</p>
          
          <!-- 主要食材和历史起源并列 -->
          <div class="flex flex-col sm:flex-row items-start gap-2 sm:gap-4">
            <!-- 主要食材 -->
            <div class="flex-[2] w-full sm:w-auto">
              <div class="flex items-center gap-2 mb-1.5 sm:mb-2">
                <div class="text-[10px] sm:text-xs font-semibold text-white drop-shadow-md">主要食材</div>
              </div>
              <div class="flex flex-wrap gap-1 sm:gap-1.5">
                ${(food.ingredients || []).map(ing => 
                  `<span class="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg bg-white/25 backdrop-blur-sm text-white text-[10px] sm:text-xs font-medium border border-white/30 drop-shadow-sm">${ing}</span>`
                ).join('')}
              </div>
            </div>
            
            ${food.history?.origin_year ? `
            <!-- 历史起源 -->
            <div class="flex-1 w-full sm:w-auto">
              <div class="flex items-center gap-2 mb-1.5 sm:mb-2">
                <div class="text-[10px] sm:text-xs font-semibold text-white drop-shadow-md">历史起源</div>
              </div>
              <div class="text-[10px] sm:text-xs text-white/95 drop-shadow-md">
                约公元 <span class="text-sm sm:text-base font-extrabold text-white drop-shadow-lg">${food.history.origin_year}</span> 年
              </div>
            </div>
            ` : ''}
          </div>
        </div>
      </div>
    </div>
  `;
}

// ========== 知识图谱可视化 ==========
function updateKnowledgeGraph(list) {
  // 优先使用主页面中的图谱容器（如果可见），否则使用模态框中的
  const graphView = document.getElementById('graph-view');
  let el = null;
  
  if (graphView && !graphView.classList.contains('hidden')) {
    el = graphView.querySelector('#knowledgeGraph');
  }
  
  if (!el) {
    el = document.getElementById('knowledgeGraph');
  }
  
  if (!el || !window.echarts) return;
  
  if (!list || list.length === 0) return;

  const nodes = [];
  const links = [];
  const nodeMap = new Map();
  let nodeIndex = 0;

  function addNode(id, name, type) {
    // 如果节点已存在，直接返回索引
    if (nodeMap.has(id)) {
      return nodeMap.get(id);
    }
    // 所有节点类型都创建，由 ECharts 图例控制显示/隐藏
    // 创建新节点
    const config = nodeTypeConfig[type];
    if (!config) {
      console.warn('Unknown node type:', type);
      return undefined;
    }
    // category 值会在后面重新映射，这里先使用原始值
    const node = {
      id: id,
      name: name,
      category: config.category, // 临时使用原始 category，后面会重新映射
      symbolSize: config.size,
      itemStyle: { color: config.color },
      label: { 
        show: true, 
        fontSize: 12,
        color: '#334155',
        fontWeight: type === 'province' ? 'bold' : 'normal',
      },
    };
    nodes.push(node);
    const index = nodeIndex++;
    nodeMap.set(id, index);
    return index;
  }

  const linkSet = new Set();
  function addLink(sourceId, targetId) {
    const sourceIdx = nodeMap.get(sourceId);
    const targetIdx = nodeMap.get(targetId);
    if (sourceIdx !== undefined && targetIdx !== undefined) {
      const linkKey = [sourceIdx, targetIdx].sort().join('-');
      if (!linkSet.has(linkKey)) {
        links.push({
          source: sourceIdx,
          target: targetIdx,
          lineStyle: { 
            color: '#CBD5E1', 
            width: 2,
            curveness: 0.3,
            opacity: 0.6,
          },
        });
        linkSet.add(linkKey);
      }
    }
  }

  list.forEach(food => {
    // 只有美食类型可见时才添加美食节点
    if (!visibleNodeTypes.has('food')) return;
    
    const foodNodeId = addNode(`food_${food.id}`, food.name, 'food');

    // 美食 -> 口味标签（只有口味类型可见时才添加）
    if (visibleNodeTypes.has('taste')) {
      (food.taste_tags || []).forEach(taste => {
        const tasteNodeId = addNode(`taste_${taste}`, taste, 'taste');
        if (foodNodeId !== undefined && tasteNodeId !== undefined) {
          addLink(`food_${food.id}`, `taste_${taste}`);
        }
      });
    }

    // 美食 -> 食材（只有食材类型可见时才添加）
    if (visibleNodeTypes.has('ingredient')) {
      (food.ingredients || []).forEach(ingredient => {
        const ingredientNodeId = addNode(`ingredient_${ingredient}`, ingredient, 'ingredient');
        if (foodNodeId !== undefined && ingredientNodeId !== undefined) {
          addLink(`food_${food.id}`, `ingredient_${ingredient}`);
        }
      });
    }
  });

  // 如果图表未初始化或容器已改变，重新初始化
  if (!knowledgeGraphChart || knowledgeGraphChart.getDom() !== el) {
    if (knowledgeGraphChart) {
      knowledgeGraphChart.dispose();
    }
    knowledgeGraphChart = echarts.init(el);
    window.addEventListener('resize', () => {
      knowledgeGraphChart && knowledgeGraphChart.resize();
    });
  }

  // 构建 categories 数组，包含所有节点类型
  const allConfigs = Object.entries(nodeTypeConfig)
    .map(([type, config]) => ({ type, ...config }));
  
  // 按照 category 值排序
  allConfigs.sort((a, b) => a.category - b.category);
  
  // 重新映射 category 值，使其从 0 开始连续
  const categoryRemap = new Map();
  allConfigs.forEach((config, index) => {
    categoryRemap.set(config.category, index);
  });
  
  // 更新所有节点的 category 值
  nodes.forEach(node => {
    const originalCategory = node.category;
    if (categoryRemap.has(originalCategory)) {
      node.category = categoryRemap.get(originalCategory);
    }
  });
  
  const categories = allConfigs.map(config => ({
    name: config.name,
    itemStyle: { color: config.color },
  }));

  // 设置图例默认选中状态：美食和口味默认选中，食材默认不选中
  const legendSelected = {};
  categories.forEach(cat => {
    // 根据节点类型名称判断是否默认选中
    const typeMap = {
      '美食': 'food',
      '口味': 'taste',
      '食材': 'ingredient'
    };
    const nodeType = typeMap[cat.name];
    legendSelected[cat.name] = visibleNodeTypes.has(nodeType);
  });

  knowledgeGraphChart.setOption({
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        if (params.dataType === 'node') {
          return `<div class="font-semibold text-white">${params.data.name}</div>`;
        }
        return '';
      },
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      borderColor: '#1E293B',
      borderRadius: 8,
      padding: [10, 14],
      textStyle: { color: '#E5E7EB', fontSize: 13 },
    },
    legend: {
      data: categories.map(c => c.name),
      bottom: window.innerWidth < 640 ? 10 : 15,
      textStyle: { 
        fontSize: window.innerWidth < 640 ? 10 : 12, 
        color: '#64748B' 
      },
      itemWidth: window.innerWidth < 640 ? 12 : 14,
      itemHeight: window.innerWidth < 640 ? 12 : 14,
      itemGap: window.innerWidth < 640 ? 12 : 20,
      selectedMode: 'multiple', // 支持多选
      selected: legendSelected, // 设置默认选中状态
    },
    series: [{
      type: 'graph',
      layout: 'force',
      data: nodes,
      links: links,
      categories: categories,
      roam: true,
      label: {
        show: true,
        position: 'right',
        fontSize: window.innerWidth < 640 ? 10 : 12,
        color: '#334155',
        fontWeight: 'normal',
      },
      labelLayout: {
        hideOverlap: true,
      },
      lineStyle: {
        color: 'source',
        curveness: 0.3,
        width: 2,
        opacity: 0.6,
      },
      emphasis: {
        focus: 'adjacency',
        lineStyle: {
          width: 4,
          opacity: 1,
        },
        itemStyle: {
          shadowBlur: 15,
          shadowColor: 'rgba(0, 0, 0, 0.3)',
          borderWidth: 2,
          borderColor: '#fff',
        },
      },
      force: {
        repulsion: 800,  // 增大排斥力，使节点更分散
        gravity: 0.1,     // 减小重力，进一步增加分散度
        edgeLength: 150,  // 增加边的理想长度
        layoutAnimation: true,
      },
    }],
  });

  // 监听图例点击事件，更新可见节点类型
  knowledgeGraphChart.on('legendselectchanged', (params) => {
    const typeMap = {
      '美食': 'food',
      '口味': 'taste',
      '食材': 'ingredient'
    };
    
    // 更新visibleNodeTypes
    Object.keys(params.selected).forEach(name => {
      const nodeType = typeMap[name];
      if (nodeType) {
        if (params.selected[name]) {
          visibleNodeTypes.add(nodeType);
        } else {
          visibleNodeTypes.delete(nodeType);
        }
      }
    });
    
    // 重新渲染图谱（过滤节点）
    updateKnowledgeGraph(list);
  });
}

// ========== 悬停时更新详情（不改变选中状态）==========
function updateDetailOnHover(provinceCode) {
  // 悬停时，如果有选中的省份，则显示选中+悬停的省份；否则只显示悬停的省份
  let filtered = [];
  
  if (activeProvinceCodes.size > 0) {
    // 显示所有选中的省份 + 当前悬停的省份
    const allCodes = new Set([...activeProvinceCodes, provinceCode]);
    filtered = foods.filter(f => allCodes.has(f.province_code));
  } else {
    // 只显示悬停的省份
    filtered = foods.filter(f => f.province_code === provinceCode);
  }
  
  if (keyword.trim()) {
    const kw = keyword.trim().toLowerCase();
    filtered = filtered.filter(f => {
      const province = provinces.find(p => p.code === f.province_code);
      const text = `${f.name} ${province?.name || ''} ${f.cuisine || ''} ${(f.taste_tags || []).join(' ')} ${(f.ingredients || []).join(' ')} ${f.description || ''}`.toLowerCase();
      return text.includes(kw);
    });
  }
  
  // 根据当前视图更新对应内容
  if (currentView === 'detail') {
    renderFoodDetail(filtered);
  } else {
    // 悬停时也更新知识图谱，显示选中+悬停的省份数据
    updateKnowledgeGraph(filtered);
  }
}

// ========== 筛选和更新 ==========
function applyFilters() {
  let filtered = [...foods];

  if (activeProvinceCodes.size > 0) {
    filtered = filtered.filter(f => activeProvinceCodes.has(f.province_code));
    
    // 如果有最后选中的省份，优先显示该省份的美食详情
    if (lastSelectedProvinceCode) {
      const lastSelectedFoods = filtered.filter(f => f.province_code === lastSelectedProvinceCode);
      if (lastSelectedFoods.length > 0 && currentView === 'detail') {
        // 将最后选中的省份的美食放在最前面
        filtered = [
          ...lastSelectedFoods,
          ...filtered.filter(f => f.province_code !== lastSelectedProvinceCode)
        ];
      }
    }
  }

  if (keyword.trim()) {
    const kw = keyword.trim().toLowerCase();
    filtered = filtered.filter(f => {
      const province = provinces.find(p => p.code === f.province_code);
      const text = `${f.name} ${province?.name || ''} ${f.cuisine || ''} ${(f.taste_tags || []).join(' ')} ${(f.ingredients || []).join(' ')} ${f.description || ''}`.toLowerCase();
      return text.includes(kw);
    });
  }

  // 根据当前视图更新对应内容
  if (currentView === 'detail') {
    renderFoodDetail(filtered);
  } else if (currentView === 'graph') {
    updateKnowledgeGraph(filtered);
  } else if (currentView === 'stats') {
    updateStatsCharts();
  }
}

// ========== 事件监听 ==========

// 搜索输入
document.getElementById('keywordInput')?.addEventListener('input', (e) => {
  keyword = e.target.value;
  // 搜索时不清空选中状态，保持多选
  applyFilters();
});

// 地图重置按钮
document.getElementById('resetMapBtn')?.addEventListener('click', () => {
  // 清空选择
  activeProvinceCodes.clear();
  lastSelectedProvinceCode = null;
  
  // 清空搜索框
  const keywordInput = document.getElementById('keywordInput');
  if (keywordInput) {
    keywordInput.value = '';
    keyword = '';
  }
  
  // 取消所有选中状态并重置地图缩放和位置
  if (chinaMapChart) {
    // 获取所有省份名称，逐个取消选中
    provinces.forEach(province => {
      chinaMapChart.dispatchAction({
        type: 'unselect',
        name: province.name
      });
    });
    
    // 检测是否为移动设备
    const isMobile = window.innerWidth < 768;
    
    // 重置地图缩放和位置 - 使用 setOption 更新
    chinaMapChart.setOption({
      geo: {
        zoom: isMobile ? 1.2 : 1.5,
        center: [105, 36]
      }
    }, false);
    
    // 同时更新 series 中的 map 配置
    const currentOption = chinaMapChart.getOption();
    if (currentOption.series && currentOption.series[0]) {
      chinaMapChart.setOption({
        series: [{
          zoom: isMobile ? 1.2 : 1.5,
          center: [105, 36]
        }]
      }, false);
    }
  }
  
  // 更新标记点样式
  updateMarkerStyles();
  
  // 更新显示
  applyFilters();
});


// ========== 视图切换 ==========
let currentView = 'detail'; // 'detail'、'graph' 或 'stats'

function switchView(view) {
  currentView = view;
  
  const detailView = document.getElementById('detail-view');
  const graphView = document.getElementById('graph-view');
  const statsView = document.getElementById('stats-view');
  const detailBtn = document.getElementById('view-detail-btn');
  const graphBtn = document.getElementById('view-graph-btn');
  const statsBtn = document.getElementById('view-stats-btn');
  
  // 重置所有按钮样式
  [detailBtn, graphBtn, statsBtn].forEach(btn => {
    if (btn) {
      btn.classList.remove('active', 'bg-blue-600', 'hover:bg-blue-700', 'text-white');
      btn.classList.add('bg-white', 'hover:bg-slate-50', 'text-slate-700');
    }
  });
  
  // 隐藏所有视图
  detailView?.classList.add('hidden');
  graphView?.classList.add('hidden');
  statsView?.classList.add('hidden');
  
  if (view === 'detail') {
    detailView?.classList.remove('hidden');
    detailBtn?.classList.add('active', 'bg-blue-600', 'hover:bg-blue-700', 'text-white');
    detailBtn?.classList.remove('bg-white', 'hover:bg-slate-50', 'text-slate-700');
    applyFilters();
  } else if (view === 'graph') {
    graphView?.classList.remove('hidden');
    graphBtn?.classList.add('active', 'bg-blue-600', 'hover:bg-blue-700', 'text-white');
    graphBtn?.classList.remove('bg-white', 'hover:bg-slate-50', 'text-slate-700');
    applyFilters();
    setTimeout(() => {
      knowledgeGraphChart && knowledgeGraphChart.resize();
    }, 100);
  } else if (view === 'stats') {
    statsView?.classList.remove('hidden');
    statsBtn?.classList.add('active', 'bg-blue-600', 'hover:bg-blue-700', 'text-white');
    statsBtn?.classList.remove('bg-white', 'hover:bg-slate-50', 'text-slate-700');
    updateStatsCharts();
    setTimeout(() => {
      tasteChart && tasteChart.resize();
      ingredientWordCloudChart && ingredientWordCloudChart.resize();
      timeChart && timeChart.resize();
    }, 100);
  }
}

// 视图切换按钮事件
document.getElementById('view-detail-btn')?.addEventListener('click', () => {
  switchView('detail');
});

document.getElementById('view-graph-btn')?.addEventListener('click', () => {
  switchView('graph');
});

document.getElementById('view-stats-btn')?.addEventListener('click', () => {
  switchView('stats');
});

// ========== 统计图表 ==========
function updateStatsCharts() {
  // 获取当前筛选后的数据
  let filtered = [...foods];
  
  if (activeProvinceCodes.size > 0) {
    filtered = filtered.filter(f => activeProvinceCodes.has(f.province_code));
  }
  
  if (keyword.trim()) {
    const kw = keyword.trim().toLowerCase();
    filtered = filtered.filter(f => {
      const province = provinces.find(p => p.code === f.province_code);
      const text = `${f.name} ${province?.name || ''} ${f.cuisine || ''} ${(f.taste_tags || []).join(' ')} ${(f.ingredients || []).join(' ')} ${f.description || ''}`.toLowerCase();
      return text.includes(kw);
    });
  }
  
  updateTasteChart(filtered);
  updateIngredientWordCloud(filtered);
  updateTimeChart(filtered);
}

// 口味分布条形图（显示数量而非百分比）
function updateTasteChart(list) {
  const el = document.getElementById('tasteChart');
  if (!el || !window.echarts) return;
  
  // 统计口味出现次数
  const tasteCount = {};
  list.forEach(food => {
    (food.taste_tags || []).forEach(taste => {
      tasteCount[taste] = (tasteCount[taste] || 0) + 1;
    });
  });
  
  const data = Object.entries(tasteCount)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  
  if (!tasteChart || tasteChart.getDom() !== el) {
    if (tasteChart) tasteChart.dispose();
    tasteChart = echarts.init(el);
  }
  
  tasteChart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: '{b}: {c} 道美食'
    },
    grid: {
      left: window.innerWidth < 640 ? '8%' : '3%',
      right: window.innerWidth < 640 ? '4%' : '4%',
      bottom: window.innerWidth < 640 ? '5%' : '3%',
      top: window.innerWidth < 640 ? '8%' : '5%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      max: 34,
      axisLabel: {
        fontSize: window.innerWidth < 640 ? 9 : 11,
        color: '#64748B'
      }
    },
    yAxis: {
      type: 'category',
      data: data.map(d => d.name),
      axisLabel: {
        fontSize: window.innerWidth < 640 ? 9 : 11,
        color: '#64748B'
      }
    },
    series: [{
      name: '美食数量',
      type: 'bar',
      data: data.map(d => d.value),
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
          { offset: 0, color: '#3B82F6' },
          { offset: 1, color: '#60A5FA' }
        ]),
        borderRadius: [0, 4, 4, 0]
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowColor: 'rgba(59, 130, 246, 0.5)'
        }
      },
      label: {
        show: true,
        position: 'right',
        fontSize: window.innerWidth < 640 ? 9 : 11,
        color: '#1E293B'
      }
    }]
  });
}

// 食材词云图（使用 echarts-wordcloud 插件）
function updateIngredientWordCloud(list) {
  const el = document.getElementById('ingredientWordCloud');
  if (!el || !window.echarts) return;
  
  // 检查 wordcloud 插件是否加载
  if (!echarts.registerMap) {
    console.warn('ECharts wordcloud plugin not loaded');
    return;
  }
  
  // 统计食材出现次数
  const ingredientCount = {};
  list.forEach(food => {
    (food.ingredients || []).forEach(ingredient => {
      ingredientCount[ingredient] = (ingredientCount[ingredient] || 0) + 1;
    });
  });
  
  if (Object.keys(ingredientCount).length === 0) {
    if (ingredientWordCloudChart) ingredientWordCloudChart.dispose();
    ingredientWordCloudChart = echarts.init(el);
    ingredientWordCloudChart.setOption({
      title: {
        text: '暂无食材数据',
        left: 'center',
        top: 'middle',
        textStyle: { color: '#94A3B8', fontSize: 14 }
      }
    });
    return;
  }
  
  // 转换为词云数据格式
  const maxCount = Math.max(...Object.values(ingredientCount));
  const data = Object.entries(ingredientCount)
    .map(([name, value]) => ({
      name,
      value
    }))
    .sort((a, b) => b.value - a.value);
  
  if (!ingredientWordCloudChart || ingredientWordCloudChart.getDom() !== el) {
    if (ingredientWordCloudChart) ingredientWordCloudChart.dispose();
    ingredientWordCloudChart = echarts.init(el);
  }
  
  // 根据频率生成颜色
  const getColor = (value) => {
    if (value > maxCount * 0.7) return '#3B82F6';
    if (value > maxCount * 0.4) return '#60A5FA';
    return '#93C5FD';
  };
  
  ingredientWordCloudChart.setOption({
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        return `${params.data.name}<br/>出现次数: ${params.data.value}`;
      }
    },
    series: [{
      type: 'wordCloud',
      gridSize: 8,
      sizeRange: [14, 40],
      rotationRange: [0, 0],
      rotationStep: 0,
      shape: 'circle',
      width: '100%',
      height: '100%',
      textStyle: {
        fontFamily: 'Inter, sans-serif',
        fontWeight: 'normal',
        color: (params) => {
          return getColor(params.value);
        }
      },
      emphasis: {
        textStyle: {
          fontWeight: 'bold',
          shadowBlur: 10,
          shadowColor: 'rgba(0, 0, 0, 0.3)'
        }
      },
      data: data
    }]
  });
}

// 起源时间（柱状图：横轴年份区间，纵轴数量）
function updateTimeChart(list) {
  const el = document.getElementById('timeChart');
  if (!el || !window.echarts) return;
  
  // 提取有年份信息的美食
  const foodsWithYear = list.filter(food => food.history?.origin_year);
  
  if (foodsWithYear.length === 0) {
    if (timeChart) timeChart.dispose();
    timeChart = echarts.init(el);
    timeChart.setOption({
      title: {
        text: '暂无历史年代数据',
        left: 'center',
        top: 'middle',
        textStyle: { color: '#94A3B8', fontSize: 14 }
      }
    });
    return;
  }
  
  // 按世纪分组统计
  const centuryCounts = {};
  foodsWithYear.forEach(food => {
    const year = food.history.origin_year;
    // 将年份转换为世纪（如1700 -> 1700s, 1858 -> 1800s）
    const century = Math.floor(year / 100) * 100;
    const label = `${century}s`;
    
    if (!centuryCounts[label]) {
      centuryCounts[label] = {
        label: label,
        century: century,
        count: 0,
        foods: []
      };
    }
    centuryCounts[label].count++;
    centuryCounts[label].foods.push(food.name);
  });
  
  // 转换为数组并排序
  const chartData = Object.values(centuryCounts)
    .sort((a, b) => a.century - b.century)
    .map(item => ({
      name: item.label,
      value: item.count,
      century: item.century,
      foods: item.foods
    }));
  
  if (!timeChart || timeChart.getDom() !== el) {
    if (timeChart) timeChart.dispose();
    timeChart = echarts.init(el);
  }
  
  timeChart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#E2E8F0',
      borderWidth: 1,
      textStyle: {
        color: '#1E293B',
        fontSize: 12
      },
      formatter: (params) => {
        const data = params[0].data;
        // 将美食列表分行显示，每行最多3个
        const foodsPerLine = 3;
        const foodLines = [];
        for (let i = 0; i < data.foods.length; i += foodsPerLine) {
          foodLines.push(data.foods.slice(i, i + foodsPerLine).join('、'));
        }
        const foodsHtml = foodLines.map(line => 
          `<div style="color: #64748B; font-size: 11px;">${line}</div>`
        ).join('');
        
        return `<div style="padding: 4px 0;">
          <div style="font-weight: 600; margin-bottom: 4px;">${data.name}</div>
          <div style="color: #64748B; font-size: 11px;">美食数量: ${data.value} 道</div>
          <div style="margin-top: 4px;">${foodsHtml}</div>
        </div>`;
      }
    },
    grid: {
      left: window.innerWidth < 640 ? '12%' : '8%',
      right: window.innerWidth < 640 ? '6%' : '8%',
      bottom: window.innerWidth < 640 ? '12%' : '8%',
      top: window.innerWidth < 640 ? '10%' : '8%',
      containLabel: false
    },
    xAxis: {
      type: 'category',
      data: chartData.map(d => d.name),
      axisLine: {
        show: true,
        lineStyle: {
          color: '#CBD5E1',
          width: 2
        }
      },
      axisTick: {
        show: true,
        lineStyle: {
          color: '#CBD5E1'
        },
        length: 6
      },
      axisLabel: {
        fontSize: window.innerWidth < 640 ? 9 : 11,
        color: '#64748B',
        margin: window.innerWidth < 640 ? 4 : 8,
        rotate: 0
      },
      nameTextStyle: {
        fontSize: 13,
        color: '#1E293B',
        fontWeight: '600',
        padding: [10, 0, 0, 0]
      }
    },
    yAxis: {
      type: 'value',
      name: '数量',
      nameLocation: 'middle',
      nameGap: window.innerWidth < 640 ? 30 : 40,
      axisLine: {
        show: true,
        lineStyle: {
          color: '#CBD5E1',
          width: 2
        }
      },
      axisTick: {
        show: true,
        lineStyle: {
          color: '#CBD5E1'
        },
        length: 6
      },
      axisLabel: {
        fontSize: window.innerWidth < 640 ? 9 : 11,
        color: '#64748B',
        margin: window.innerWidth < 640 ? 4 : 8
      },
      nameTextStyle: {
        fontSize: 13,
        color: '#1E293B',
        fontWeight: '600',
        padding: [0, 0, 10, 0]
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: '#E2E8F0',
          type: 'dashed',
          width: 1
        }
      }
    },
    series: [{
      name: '美食数量',
      type: 'bar',
      data: chartData,
      barWidth: '60%',
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#60A5FA' },
          { offset: 1, color: '#3B82F6' }
        ]),
        borderRadius: [4, 4, 0, 0]
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowColor: 'rgba(59, 130, 246, 0.5)'
        }
      },
      label: {
        show: true,
        position: 'top',
        formatter: '{c}',
        fontSize: window.innerWidth < 640 ? 9 : 11,
        color: '#1E293B',
        fontWeight: '600'
      }
    }]
  });
}

// ========== 窗口大小改变时自动调整图表 ==========
let resizeTimer = null;
function handleResize() {
  // 防抖处理，避免频繁resize
  if (resizeTimer) {
    clearTimeout(resizeTimer);
  }
  resizeTimer = setTimeout(() => {
    if (chinaMapChart) {
      chinaMapChart.resize();
    }
    if (knowledgeGraphChart) {
      knowledgeGraphChart.resize();
    }
    if (tasteChart) {
      tasteChart.resize();
    }
    if (ingredientWordCloudChart) {
      ingredientWordCloudChart.resize();
    }
    if (timeChart) {
      timeChart.resize();
    }
  }, 150);
}

// 监听窗口大小改变
window.addEventListener('resize', handleResize);

// 启动
loadData();

