// Local mock scenarios used by the storefront sample.
// These examples are intentionally small and exist to exercise the frontend
// rendering contract, not to represent a full production catalog.
import { BundleTierConfig, NextAction, ProductRecord, ValueMapEntry } from './models';

export type MockToolCall = {
  name: string;
  args?: string;
  result?: string;
};

const sofas: ProductRecord[] = [
  {
    ec_product_id: 'sofa-arc-3-seat',
    ec_name: 'Arc 3 Seat Sofa',
    ec_brand: 'Freedom',
    ec_price: 2499,
    ec_promo_price: 2199,
    ec_image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
    clickUri: '/products/arc-3-seat-sofa',
    description: 'Soft curved profile with a deep sit for relaxed living rooms.',
    accent: '#b98d68',
    material: 'Textured fabric',
    seats: '3',
    style: 'Contemporary'
  },
  {
    ec_product_id: 'sofa-haven-modular',
    ec_name: 'Haven Modular Sofa',
    ec_brand: 'Freedom',
    ec_price: 3299,
    ec_image: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=1200&q=80',
    clickUri: '/products/haven-modular-sofa',
    description: 'Modular design with a lounge-first shape for family rooms.',
    accent: '#9a7658',
    material: 'Performance fabric',
    seats: '4+',
    style: 'Relaxed'
  },
  {
    ec_product_id: 'sofa-marlow-leather',
    ec_name: 'Marlow Leather Sofa',
    ec_brand: 'Freedom',
    ec_price: 3899,
    ec_image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=80',
    clickUri: '/products/marlow-leather-sofa',
    description: 'Clean-lined leather sofa with a dressier feel for formal spaces.',
    accent: '#7d624d',
    material: 'Leather',
    seats: '3',
    style: 'Tailored'
  }
];

const livingBundleSlots: Record<string, ProductRecord[]> = {
  'bundle-surface-sofa': [sofas[0]],
  'bundle-surface-coffee-table': [
    {
      ec_product_id: 'living-orbit-coffee',
      ec_name: 'Orbit Coffee Table',
      ec_brand: 'Freedom',
      ec_price: 899,
      ec_image: 'https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?auto=format&fit=crop&w=1200&q=80',
      clickUri: '/products/orbit-coffee-table',
      description: 'Rounded coffee table to soften a lounge layout.',
      accent: '#9b7b60'
    }
  ],
  'bundle-surface-rug': [
    {
      ec_product_id: 'rug-linden-neutral',
      ec_name: 'Linden Neutral Rug',
      ec_brand: 'Freedom',
      ec_price: 699,
      ec_image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
      clickUri: '/products/linden-neutral-rug',
      description: 'Soft neutral rug for grounding a living room seating area.',
      accent: '#cab59a'
    }
  ]
};

const sofaActions: NextAction[] = [
  { text: 'Compare the top two sofas', type: 'followup' },
  { text: 'Show modular sofas under $3500', type: 'search' },
  { text: 'What coffee tables work with these sofas?', type: 'followup' }
];

const bundleActions: NextAction[] = [
  { text: 'Swap the rug for something darker', type: 'followup' },
  { text: 'Show a warmer timber coffee table', type: 'search' },
  { text: 'Build a bedroom bundle instead', type: 'search' }
];

export type MockScenario = {
  intro: string;
  reasoningText: string;
  toolCalls: MockToolCall[];
  textChunks: string[];
  stateSnapshot: Record<string, unknown>;
  activitySnapshots: Array<{
    messageId: string;
    activityType: string;
    operations: Record<string, unknown>[];
  }>;
};

function splitText(text: string): string[] {
  return text.split(/(\s+)/).filter(Boolean);
}

function buildProductItems(products: ProductRecord[]) {
  return products.map((product) => ({
    valueMap: Object.entries(product).reduce<ValueMapEntry[]>((result, [key, value]) => {
      if (value == null) {
        return result;
      }
      if (typeof value === 'number') {
        result.push({ key, valueNumber: value });
      } else {
        result.push({ key, valueString: String(value) });
      }
      return result;
    }, [])
  }));
}

function buildActionsItems(actions: NextAction[]) {
  return actions.map((action) => ({
    valueMap: [
      { key: 'text', valueString: action.text },
      { key: 'type', valueString: action.type }
    ]
  }));
}

function buildProductCarouselSnapshot(
  messageId: string,
  surfaceId: string,
  heading: string,
  products: ProductRecord[],
  actions: NextAction[]
) {
  return {
    messageId,
    activityType: 'a2ui-surface',
    operations: [
      {
        beginRendering: {
          surfaceId,
          root: `root-${surfaceId}`,
          catalogId: 'coveo-commerce-v1'
        }
      },
      {
        surfaceUpdate: {
          surfaceId,
          components: [
            {
              id: `root-${surfaceId}`,
              component: {
                ProductCarousel: {
                  heading: { literalString: heading },
                  products: {
                    componentId: `product-card-${surfaceId}`,
                    dataBinding: '/items'
                  }
                }
              }
            }
          ]
        }
      },
      {
        dataModelUpdate: {
          surfaceId,
          contents: [{ key: 'items', valueMap: buildProductItems(products) }]
        }
      },
      {
        beginRendering: {
          surfaceId: 'next-actions-surface',
          root: 'root-next-actions-surface',
          catalogId: 'coveo-commerce-v1'
        }
      },
      {
        surfaceUpdate: {
          surfaceId: 'next-actions-surface',
          components: [
            {
              id: 'root-next-actions-surface',
              component: {
                NextActionsBar: {
                  actions: {
                    componentId: 'button-next-actions-surface',
                    dataBinding: '/actions'
                  }
                }
              }
            }
          ]
        }
      },
      {
        dataModelUpdate: {
          surfaceId: 'next-actions-surface',
          contents: [{ key: 'actions', valueMap: buildActionsItems(actions) }]
        }
      }
    ]
  };
}

function buildComparisonSnapshot(
  messageId: string,
  surfaceId: string,
  heading: string,
  products: ProductRecord[],
  attributes: string[],
  summary: string,
  actions: NextAction[]
) {
  return {
    messageId,
    activityType: 'a2ui-surface',
    operations: [
      {
        beginRendering: {
          surfaceId,
          root: `root-${surfaceId}`,
          catalogId: 'coveo-commerce-v1'
        }
      },
      {
        surfaceUpdate: {
          surfaceId,
          components: [
            {
              id: `root-${surfaceId}`,
              component: {
                ComparisonTable: {
                  heading: { literalString: heading },
                  attributes,
                  products: {
                    componentId: `comparison-card-${surfaceId}`,
                    dataBinding: '/items'
                  }
                }
              }
            },
            {
              id: `comparison-card-${surfaceId}`,
              component: {
                ProductCard: {
                  ec_product_id: { path: 'ec_product_id' },
                  ec_name: { path: 'ec_name' },
                  ec_brand: { path: 'ec_brand' },
                  ec_image: { path: 'ec_image' },
                  ec_price: { path: 'ec_price' },
                  ec_promo_price: { path: 'ec_promo_price' }
                }
              }
            }
          ]
        }
      },
      {
        dataModelUpdate: {
          surfaceId,
          contents: [{ key: 'items', valueMap: buildProductItems(products) }]
        }
      },
      {
        beginRendering: {
          surfaceId: 'comparison-summary-surface',
          root: 'root-comparison-summary-surface',
          catalogId: 'coveo-commerce-v1'
        }
      },
      {
        surfaceUpdate: {
          surfaceId: 'comparison-summary-surface',
          components: [
            {
              id: 'root-comparison-summary-surface',
              component: {
                ComparisonSummary: {
                  text: { literalString: summary }
                }
              }
            }
          ]
        }
      },
      {
        beginRendering: {
          surfaceId: 'next-actions-surface',
          root: 'root-next-actions-surface',
          catalogId: 'coveo-commerce-v1'
        }
      },
      {
        surfaceUpdate: {
          surfaceId: 'next-actions-surface',
          components: [
            {
              id: 'root-next-actions-surface',
              component: {
                NextActionsBar: {
                  actions: {
                    componentId: 'button-next-actions-surface',
                    dataBinding: '/actions'
                  }
                }
              }
            }
          ]
        }
      },
      {
        dataModelUpdate: {
          surfaceId: 'next-actions-surface',
          contents: [{ key: 'actions', valueMap: buildActionsItems(actions) }]
        }
      }
    ]
  };
}

function buildBundleSnapshot(
  messageId: string,
  title: string,
  bundles: BundleTierConfig[],
  actions: NextAction[]
) {
  return {
    messageId,
    activityType: 'a2ui-surface',
    operations: [
      ...Object.entries(livingBundleSlots).flatMap(([surfaceId, products]) => [
        {
          beginRendering: {
            surfaceId,
            root: `root-${surfaceId}`,
            catalogId: 'coveo-commerce-v1'
          }
        },
        {
          surfaceUpdate: {
            surfaceId,
            components: [
              {
                id: `root-${surfaceId}`,
                component: {
                  ProductCard: {
                    ec_product_id: { path: 'ec_product_id' },
                    ec_name: { path: 'ec_name' },
                    ec_brand: { path: 'ec_brand' },
                    ec_image: { path: 'ec_image' },
                    ec_price: { path: 'ec_price' },
                    ec_promo_price: { path: 'ec_promo_price' }
                  }
                }
              }
            ]
          }
        },
        {
          dataModelUpdate: {
            surfaceId,
            contents: [{ key: 'items', valueMap: buildProductItems(products) }]
          }
        }
      ]),
      {
        beginRendering: {
          surfaceId: 'bundle-display-surface',
          root: 'root-bundle-display-surface',
          catalogId: 'coveo-commerce-v1'
        }
      },
      {
        surfaceUpdate: {
          surfaceId: 'bundle-display-surface',
          components: [
            {
              id: 'root-bundle-display-surface',
              component: {
                BundleDisplay: {
                  title: { literalString: title },
                  bundles
                }
              }
            }
          ]
        }
      },
      {
        beginRendering: {
          surfaceId: 'next-actions-surface',
          root: 'root-next-actions-surface',
          catalogId: 'coveo-commerce-v1'
        }
      },
      {
        surfaceUpdate: {
          surfaceId: 'next-actions-surface',
          components: [
            {
              id: 'root-next-actions-surface',
              component: {
                NextActionsBar: {
                  actions: {
                    componentId: 'button-next-actions-surface',
                    dataBinding: '/actions'
                  }
                }
              }
            }
          ]
        }
      },
      {
        dataModelUpdate: {
          surfaceId: 'next-actions-surface',
          contents: [{ key: 'actions', valueMap: buildActionsItems(actions) }]
        }
      }
    ]
  };
}

function buildCarouselSkeleton(surfaceId: string, heading: string) {
  return {
    messageId: 'activity-products',
    activityType: 'a2ui-surface',
    operations: [
      {
        beginRendering: {
          surfaceId,
          root: `root-${surfaceId}`,
          catalogId: 'coveo-commerce-v1'
        }
      },
      {
        surfaceUpdate: {
          surfaceId,
          components: [
            {
              id: `root-${surfaceId}`,
              component: {
                ProductCarousel: {
                  heading: {
                    literalString: heading
                  },
                  isLoading: true
                }
              }
            }
          ]
        }
      }
    ]
  };
}

function buildComparisonSkeleton(surfaceId: string, heading: string) {
  return {
    messageId: 'activity-compare',
    activityType: 'a2ui-surface',
    operations: [
      {
        beginRendering: {
          surfaceId,
          root: `root-${surfaceId}`,
          catalogId: 'coveo-commerce-v1'
        }
      },
      {
        surfaceUpdate: {
          surfaceId,
          components: [
            {
              id: `root-${surfaceId}`,
              component: {
                ComparisonTable: {
                  heading: { literalString: heading },
                  isLoading: true
                }
              }
            }
          ]
        }
      }
    ]
  };
}

function buildBundleSkeleton() {
  return {
    messageId: 'activity-bundle',
    activityType: 'a2ui-surface',
    operations: [
      {
        beginRendering: {
          surfaceId: 'bundle-display-surface',
          root: 'root-bundle-display-surface',
          catalogId: 'coveo-commerce-v1'
        }
      },
      {
        surfaceUpdate: {
          surfaceId: 'bundle-display-surface',
          components: [
            {
              id: 'root-bundle-display-surface',
              component: {
                BundleDisplay: {
                  title: { literalString: 'Building a Freedom room set' },
                  isLoading: true
                }
              }
            }
          ]
        }
      }
    ]
  };
}

function buildNextActionsSkeleton() {
  return {
    messageId: 'activity-actions',
    activityType: 'a2ui-surface',
    operations: [
      {
        beginRendering: {
          surfaceId: 'next-actions-surface',
          root: 'root-next-actions-surface',
          catalogId: 'coveo-commerce-v1'
        }
      },
      {
        surfaceUpdate: {
          surfaceId: 'next-actions-surface',
          components: [
            {
              id: 'root-next-actions-surface',
              component: {
                NextActionsBar: {
                  isLoading: true
                }
              }
            }
          ]
        }
      }
    ]
  };
}

export function getMockScenario(prompt: string): MockScenario {
  const normalized = prompt.toLowerCase();

  if (normalized.includes('bundle') || normalized.includes('room set')) {
    return {
      intro:
        'I put together a Freedom living room bundle with a soft contemporary sofa, a rounded coffee table, and a neutral rug so the space feels cohesive without getting too heavy.',
      reasoningText:
        'The request points toward a coordinated room recommendation rather than a single product shortlist. A compact bundle with a sofa, coffee table, and rug should make the shopping intent clearer.',
      toolCalls: [
        {
          name: 'route',
          args: '{"intent":"bundle"}',
          result: 'Routed to bundle curation flow.'
        },
        {
          name: 'render_bundle_display',
          args: '{"bundleType":"living_room_refresh"}',
          result: 'Prepared structured bundle surface.'
        },
        {
          name: 'render_next_actions',
          args: '{"count":3}',
          result: 'Prepared follow-up actions.'
        }
      ],
      textChunks: splitText(
        'I put together a Freedom living room bundle with a soft contemporary sofa, a rounded coffee table, and a neutral rug so the space feels cohesive without getting too heavy.'
      ),
      stateSnapshot: {
        policy_execution_state: {
          current_state: 'respond/complete',
          state_history: [
            ['route/intake', 'graph'],
            ['discovery/bundle_curate', 'graph'],
            ['respond/complete', 'graph']
          ],
          iteration_count: 3
        },
        label: 'Assembling a room bundle'
      },
      activitySnapshots: [
        buildBundleSkeleton(),
        buildNextActionsSkeleton(),
        buildBundleSnapshot('activity-bundle', 'Freedom living room refresh', [
          {
            bundleId: 'tier-starter',
            label: 'Starter set',
            description: 'A balanced lounge setup for everyday living.',
            slots: [
              { categoryLabel: 'Sofa', surfaceRef: 'bundle-surface-sofa' },
              { categoryLabel: 'Coffee table', surfaceRef: 'bundle-surface-coffee-table' },
              { categoryLabel: 'Rug', surfaceRef: 'bundle-surface-rug' }
            ]
          }
        ], bundleActions)
      ]
    };
  }

  if (normalized.includes('compare') || normalized.includes('vs')) {
    return {
      intro:
        'I compared three Freedom sofa directions so you can weigh layout flexibility, material feel, and how formal you want the room to read.',
      reasoningText:
        'The shopper is asking for tradeoffs, so comparison is more useful than a simple product list. The key attributes are material, seating capacity, and style direction.',
      toolCalls: [
        {
          name: 'route',
          args: '{"intent":"compare"}',
          result: 'Routed to comparison flow.'
        },
        {
          name: 'coveo_commerce_search',
          args: '{"query":"Freedom sofas","limit":3}',
          result: 'Retrieved three sofa candidates.'
        },
        {
          name: 'render_comparison_table',
          args: '{"attributes":["material","seats","style"]}',
          result: 'Prepared comparison surface.'
        },
        {
          name: 'render_next_actions',
          args: '{"count":3}',
          result: 'Prepared follow-up actions.'
        }
      ],
      textChunks: splitText(
        'I compared three Freedom sofa directions so you can weigh layout flexibility, material feel, and how formal you want the room to read.'
      ),
      stateSnapshot: {
        policy_execution_state: {
          current_state: 'respond/complete',
          state_history: [
            ['route/intake', 'graph'],
            ['discovery/compare', 'graph'],
            ['respond/complete', 'graph']
          ],
          iteration_count: 3
        },
        label: 'Comparing products'
      },
      activitySnapshots: [
        buildComparisonSkeleton('comparison-surface-sofas', 'Comparing Freedom sofas'),
        buildNextActionsSkeleton(),
        buildComparisonSnapshot(
          'activity-compare',
          'comparison-surface-sofas',
          'Freedom sofas to compare',
          sofas,
          ['material', 'seats', 'style'],
          'Haven is the most flexible if you want a family-room modular layout, Arc feels softer and more design-led, and Marlow is the dressiest choice if leather is a priority.',
          sofaActions
        )
      ]
    };
  }

  return {
    intro:
      'I found a few Freedom sofa directions that cover modular, curved, and leather looks so you can decide whether the room should feel softer, more flexible, or a little more tailored.',
    reasoningText:
      'The request is broad, so a shortlist is the best first response. The set should cover distinct styles so the shopper can react to a direction rather than a single product.',
    toolCalls: [
      {
        name: 'route',
        args: '{"intent":"discover"}',
        result: 'Routed to discovery flow.'
      },
      {
        name: 'coveo_commerce_search',
        args: '{"query":"Freedom sofas","style":"soft living room","limit":3}',
        result: 'Retrieved sofa shortlist.'
      },
      {
        name: 'render_product_carousel',
        args: '{"surface":"products-surface-sofas"}',
        result: 'Prepared product carousel.'
      },
      {
        name: 'render_next_actions',
        args: '{"count":3}',
        result: 'Prepared follow-up actions.'
      }
    ],
    textChunks: splitText(
      'I found a few Freedom sofa directions that cover modular, curved, and leather looks so you can decide whether the room should feel softer, more flexible, or a little more tailored.'
    ),
    stateSnapshot: {
      policy_execution_state: {
        current_state: 'respond/complete',
        state_history: [
          ['route/intake', 'graph'],
          ['discovery/search_or_render', 'graph'],
          ['respond/complete', 'graph']
        ],
        iteration_count: 3
      },
      label: 'Searching Freedom sofas'
    },
    activitySnapshots: [
        buildCarouselSkeleton(
          'products-surface-sofas',
          'Pulling together Freedom sofas that fit a softer living room'
        ),
        buildNextActionsSkeleton(),
        buildProductCarouselSnapshot(
          'activity-products',
          'products-surface-sofas',
          'Freedom sofas for a softer living room',
          sofas,
          sofaActions
        )
      ]
    };
  }
