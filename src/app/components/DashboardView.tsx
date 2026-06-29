import { useState, useEffect } from 'react';
import { ProcessCategoryCard } from './ProcessCategoryCard';
import { MouldingCategoryCard } from './MouldingCategoryCard';
import { ProcessOverviewDialog } from './ProcessOverviewDialog';
import { MouldingOverviewDialog } from './MouldingOverviewDialog';
import { SafetyAlertBanner } from './SafetyAlertBanner';
import { DashboardTrends } from './DashboardTrends';
import { InventorySection } from './InventorySection';

interface CategorySummary {
  category: string;
  title: string;
  processCount: number;
  inProgress: number;
  hold: number;
  completed: number;
  activeMoulds: string[];
}

interface DashboardViewProps {
  onNavigateToProcess: (processId: number, partId?: number) => void;
}

export function DashboardView({ onNavigateToProcess }: DashboardViewProps) {
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<{ category: string; title: string } | null>(null);
  const [showMouldingDialog, setShowMouldingDialog] = useState(false);

  useEffect(() => {
    async function fetchData() {
      // We still fetch category summary for other cards (Prefab/Moulding stats) if needed below
      // or just rely on InventorySection for inventory.
      // Keeping fetch for other sections.
      try {
        const catRes = await fetch('/api/category-summary');
        const catData = await catRes.json();

        // Defensive guard: ensure API returns an array
        if (!Array.isArray(catData)) {
          console.error('Category summary API returned invalid data:', catData);
          setCategories([]);
        } else {
          setCategories(catData);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        setCategories([]); // Safe fallback on error
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleSelectProcess = (processId: number) => {
    setSelectedCategory(null);
    setShowMouldingDialog(false);
    onNavigateToProcess(processId);
  };

  const prefabCategory = categories.find(c => c.category === 'prefabricated');
  const mouldingCategory = categories.find(c => c.category === 'moulding');
  const finishingCategory = categories.find(c => c.category === 'finishing');

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <SafetyAlertBanner />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Production Dashboard</h1>
        <p className="text-slate-400">Monitor blade manufacturing across all stages</p>
      </div>

      <InventorySection onNavigateToProcess={onNavigateToProcess} />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {/* Deprecated Inventory Card Removed */}

            {prefabCategory && (
              <ProcessCategoryCard
                title={prefabCategory.title}
                category={prefabCategory.category}
                processCount={prefabCategory.processCount}
                inProgress={prefabCategory.inProgress}
                hold={prefabCategory.hold}
                completed={prefabCategory.completed}
                onClick={() => setSelectedCategory({ category: 'prefabricated', title: 'Prefabricated' })}
              />
            )}
            {mouldingCategory && (
              <MouldingCategoryCard
                title={mouldingCategory.title}
                processCount={mouldingCategory.processCount}
                inProgress={mouldingCategory.inProgress}
                hold={mouldingCategory.hold}
                completed={mouldingCategory.completed}
                onClick={() => setShowMouldingDialog(true)}
              />
            )}
            {finishingCategory && (
              <ProcessCategoryCard
                title={finishingCategory.title}
                category={finishingCategory.category}
                processCount={finishingCategory.processCount}
                inProgress={finishingCategory.inProgress}
                hold={finishingCategory.hold}
                completed={finishingCategory.completed}
                onClick={() => setSelectedCategory({ category: 'finishing', title: 'Finishing' })}
              />
            )}
          </div>

          <DashboardTrends />
        </>
      )}

      {selectedCategory && (
        <ProcessOverviewDialog
          category={selectedCategory.category}
          categoryTitle={selectedCategory.title}
          onClose={() => setSelectedCategory(null)}
          onSelectProcess={onNavigateToProcess}
        />
      )}

      {showMouldingDialog && (
        <MouldingOverviewDialog
          onClose={() => setShowMouldingDialog(false)}
          onSelectProcess={handleSelectProcess}
        />
      )}
    </div>
  );
}
