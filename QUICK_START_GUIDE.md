# 🚀 Quick Start Guide - Optimized Components

## Table of Contents
1. [Skeleton Components](#skeleton-components)
2. [Memoized Components](#memoized-components)
3. [Debounced Search](#debounced-search)
4. [Lazy Loading](#lazy-loading)
5. [Custom Hooks](#custom-hooks)
6. [Performance Monitoring](#performance-monitoring)

---

## Skeleton Components

### Basic Skeleton
```jsx
import { Skeleton } from './components/Skeleton';

<Skeleton width="100px" height="20px" borderRadius="4px" />
```

### Skeleton Stat Card
```jsx
import { SkeletonStatCard } from './components/Skeleton';

<div className="stats-grid">
  {loading ? (
    Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)
  ) : (
    stats.map(stat => <StatCard key={stat.id} {...stat} />)
  )}
</div>
```

### Skeleton Table
```jsx
import { SkeletonTableRow } from './components/Skeleton';

<table className="data-table">
  <tbody>
    {loading ? (
      Array.from({ length: 10 }).map((_, i) => (
        <SkeletonTableRow key={i} columns={7} />
      ))
    ) : (
      data.map(item => <TableRow key={item.id} data={item} />)
    )}
  </tbody>
</table>
```

### Skeleton List
```jsx
import { SkeletonList } from './components/Skeleton';

{loading ? (
  <SkeletonList count={5} gap="1rem" />
) : (
  items.map(item => <ItemCard key={item.id} {...item} />)
)}
```

---

## Memoized Components

### StatCard (Auto-optimized)
```jsx
import StatCard from './components/StatCard';

<StatCard
  title="Total Personel"
  value={stats.totalPersonel}
  icon={Users}
  colorClass="card-primary"
  onClick={() => handleClick()}
  isLoading={loading}
/>
```

### PersonelTableRow (Auto-optimized)
```jsx
import PersonelTableRow from './components/PersonelTableRow';

{personelList.map((personel, index) => (
  <PersonelTableRow
    key={personel.id}
    personel={personel}
    index={index}
    currentPage={currentPage}
    itemsPerPage={itemsPerPage}
    user={user}
    onViewHistory={handleViewHistory}
    onEdit={handleEdit}
    onDelete={handleDelete}
    onRestore={handleRestore}
    onAddCatatan={handleAddCatatan}
  />
))}
```

---

## Debounced Search

### Basic Usage
```jsx
import DebouncedSearchBar from './components/DebouncedSearchBar';

<DebouncedSearchBar
  placeholder="Cari personel..."
  onSearch={(query) => fetchData(query)}
/>
```

### With Custom Delay
```jsx
<DebouncedSearchBar
  placeholder="Cari..."
  onSearch={handleSearch}
  debounceDelay={300}  // 300ms delay
  showButton={true}
/>
```

### Without Button
```jsx
<DebouncedSearchBar
  placeholder="Real-time search..."
  onSearch={handleSearch}
  showButton={false}  // No search button, auto-search only
/>
```

### With Initial Value
```jsx
<DebouncedSearchBar
  placeholder="Cari..."
  onSearch={handleSearch}
  initialValue="preset query"
/>
```

---

## Lazy Loading

### Lazy Image
```jsx
import LazyImage from './components/LazyImage';
import { Skeleton } from './components/Skeleton';

<LazyImage
  src="https://example.com/large-image.jpg"
  alt="Description"
  placeholder={<Skeleton width="100%" height="200px" />}
  className="my-image"
  style={{ height: '200px', width: '100%' }}
/>
```

### Lazy Image without Placeholder
```jsx
<LazyImage
  src={imageUrl}
  alt="Logo"
  className="logo"
/>
```

### Custom Threshold
```jsx
<LazyImage
  src={imageUrl}
  alt="Banner"
  threshold={0.5}  // Load when 50% visible
  placeholder={<div>Loading...</div>}
/>
```

---

## Custom Hooks

### useDebounce
```jsx
import { useDebounce } from './hooks/useDebounce';

const MyComponent = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  useEffect(() => {
    if (debouncedSearchTerm) {
      fetchData(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm]);

  return (
    <input
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
    />
  );
};
```

### useLocalStorage
```jsx
import { useLocalStorage } from './hooks/useLocalStorage';

const MyComponent = () => {
  const [user, setUser, removeUser] = useLocalStorage('user', null);

  return (
    <div>
      <p>User: {user?.name}</p>
      <button onClick={() => setUser({ name: 'John', age: 30 })}>
        Save User
      </button>
      <button onClick={removeUser}>
        Remove User
      </button>
    </div>
  );
};
```

### useIntersectionObserver
```jsx
import { useIntersectionObserver } from './hooks/useIntersectionObserver';

const InfiniteScroll = () => {
  const [loadMoreRef, isIntersecting] = useIntersectionObserver({
    threshold: 0.5
  });

  useEffect(() => {
    if (isIntersecting) {
      loadMoreData();
    }
  }, [isIntersecting]);

  return (
    <div>
      {items.map(item => <Item key={item.id} {...item} />)}
      <div ref={loadMoreRef}>
        {isIntersecting && <Skeleton />}
      </div>
    </div>
  );
};
```

---

## Performance Monitoring

### Basic Setup (Already Done)
Performance monitoring is automatically initialized in `main.jsx`.

### View Metrics (Development)
Open browser console to see performance logs:
```
[Performance] LCP: 892ms
[Performance] FCP: 456ms
[Performance] FID: 12ms
[Performance] CLS: 0.02
[Performance] TTFB: 234ms
[Performance] TTI: 1234ms
```

### Track Custom Metrics
```jsx
import { trackMetric } from './utils/performanceMonitoring';

const MyComponent = () => {
  useEffect(() => {
    const startTime = performance.now();

    fetchData().then(() => {
      const endTime = performance.now();
      trackMetric('DataFetchTime', endTime - startTime);
    });
  }, []);
};
```

### Measure Component Render
```jsx
import { measureComponentRender } from './utils/performanceMonitoring';

const HeavyComponent = () => {
  useEffect(() => {
    const stopMeasure = measureComponentRender('HeavyComponent');

    return () => {
      stopMeasure(); // Logs render time
    };
  }, []);

  return <div>Heavy component...</div>;
};
```

### Get Current Metrics
```jsx
import { getPerformanceMetrics } from './utils/performanceMonitoring';

const PerformanceDashboard = () => {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    const currentMetrics = getPerformanceMetrics();
    setMetrics(currentMetrics);
  }, []);

  return (
    <div>
      <p>FCP: {metrics?.fcp}ms</p>
      <p>LCP: {metrics?.lcp}ms</p>
      <p>TTFB: {metrics?.ttfb}ms</p>
    </div>
  );
};
```

---

## Real-World Examples

### Example 1: Dashboard with Skeleton Loading
```jsx
import StatCard from './components/StatCard';
import { SkeletonStatCard } from './components/Skeleton';

const Dashboard = () => {
  const { stats, loading } = useDashboard();

  return (
    <div className="stats-grid">
      {loading ? (
        Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStatCard key={i} />
        ))
      ) : (
        <>
          <StatCard
            title="Total Personel"
            value={stats.totalPersonel}
            icon={Users}
            colorClass="card-primary"
            onClick={handleClick}
          />
          <StatCard
            title="Catpers Aktif"
            value={stats.catpersAktif}
            icon={AlertCircle}
            colorClass="card-danger"
          />
          {/* More cards... */}
        </>
      )}
    </div>
  );
};
```

### Example 2: Personel List with Debounced Search
```jsx
import DebouncedSearchBar from './components/DebouncedSearchBar';
import PersonelTableRow from './components/PersonelTableRow';
import { SkeletonTableRow } from './components/Skeleton';

const PersonelList = () => {
  const [personelList, setPersonelList] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (query) => {
    setLoading(true);
    const data = await fetchPersonel(query);
    setPersonelList(data);
    setLoading(false);
  };

  return (
    <div>
      <DebouncedSearchBar
        placeholder="Cari personel (NRP, Nama)..."
        onSearch={handleSearch}
        debounceDelay={500}
      />

      <table className="data-table">
        <thead>
          <tr>
            <th>No.</th>
            <th>NRP/NIP</th>
            <th>Nama</th>
            {/* More headers... */}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 10 }).map((_, i) => (
              <SkeletonTableRow key={i} columns={7} />
            ))
          ) : (
            personelList.map((personel, index) => (
              <PersonelTableRow
                key={personel.id}
                personel={personel}
                index={index}
                user={user}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
```

### Example 3: Image Gallery with Lazy Loading
```jsx
import LazyImage from './components/LazyImage';
import { Skeleton } from './components/Skeleton';

const ImageGallery = ({ images }) => {
  return (
    <div className="image-grid">
      {images.map((image) => (
        <div key={image.id} className="image-item">
          <LazyImage
            src={image.url}
            alt={image.title}
            placeholder={<Skeleton width="100%" height="200px" />}
            style={{ height: '200px', borderRadius: '8px' }}
          />
          <p>{image.title}</p>
        </div>
      ))}
    </div>
  );
};
```

---

## Best Practices

### 1. Always Use Skeleton for Loading States
❌ **Bad:**
```jsx
{loading && <div>Loading...</div>}
```

✅ **Good:**
```jsx
{loading ? <SkeletonStatCard /> : <StatCard {...data} />}
```

### 2. Memoize Callbacks for Memoized Components
❌ **Bad:**
```jsx
<StatCard onClick={() => handleClick(id)} />
// Creates new function on every render
```

✅ **Good:**
```jsx
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);

<StatCard onClick={handleClick} />
```

### 3. Use Debounced Search for All Text Inputs
❌ **Bad:**
```jsx
<input onChange={(e) => fetchData(e.target.value)} />
// Triggers API call on every keystroke
```

✅ **Good:**
```jsx
<DebouncedSearchBar onSearch={fetchData} debounceDelay={500} />
// Triggers API call only after user stops typing
```

### 4. Lazy Load Images
❌ **Bad:**
```jsx
<img src="large-image.jpg" alt="Banner" />
// Loads immediately, blocks page render
```

✅ **Good:**
```jsx
<LazyImage
  src="large-image.jpg"
  alt="Banner"
  placeholder={<Skeleton width="100%" height="200px" />}
/>
// Loads only when visible
```

---

## Performance Checklist

- [ ] Use `<Skeleton />` components for all loading states
- [ ] Wrap heavy components in `React.memo()`
- [ ] Use `<DebouncedSearchBar />` for all search inputs
- [ ] Use `<LazyImage />` for all images
- [ ] Use `useCallback()` for callbacks passed to memoized components
- [ ] Use `useMemo()` for expensive computations
- [ ] Check console for performance metrics
- [ ] Run Lighthouse audit (Score > 90)
- [ ] Test on slow 3G network
- [ ] Test with React DevTools Profiler

---

## Need Help?

### Documentation
- `/app/OPTIMIZATION_REPORT.md` - Phase 1 details
- `/app/PHASE_2_IMPLEMENTATION.md` - Phase 2 details
- `/app/COMPLETE_OPTIMIZATION_SUMMARY.md` - Complete overview

### Tools
- React DevTools - Component profiling
- Chrome DevTools - Network & Performance
- Lighthouse - Performance audits

---

## 🎉 You're All Set!

Start using these optimized components in your application for **better performance** and **smoother user experience**! 🚀
