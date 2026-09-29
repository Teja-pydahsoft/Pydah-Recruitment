import React from 'react';
import styled, { keyframes } from 'styled-components';

// Shimmer animation for skeleton loading
const shimmer = keyframes`
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
`;

const SkeletonBase = styled.div`
  background: linear-gradient(
    90deg,
    #f0f0f0 0%,
    #f8f8f8 50%,
    #f0f0f0 100%
  );
  background-size: 2000px 100%;
  animation: ${shimmer} 1.5s infinite;
  border-radius: 4px;
`;

// Skeleton Box - Basic building block
export const SkeletonBox = styled(SkeletonBase)`
  width: ${props => props.width || '100%'};
  height: ${props => props.height || '20px'};
  margin: ${props => props.margin || '0'};
`;

// Skeleton Circle - For avatars/icons
export const SkeletonCircle = styled(SkeletonBase)`
  width: ${props => props.size || '40px'};
  height: ${props => props.size || '40px'};
  border-radius: 50%;
  margin: ${props => props.margin || '0'};
`;

// Skeleton Card - For card components
export const SkeletonCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

// Skeleton Table - For table components
export const SkeletonTable = styled.div`
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
`;

const TableHeader = styled.div`
  display: grid;
  grid-template-columns: ${props => props.$columns || 'repeat(5, 1fr)'};
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: #f8fafc;
  border-bottom: 2px solid #e2e8f0;
`;

const TableRow = styled.div`
  display: grid;
  grid-template-columns: ${props => props.$columns || 'repeat(5, 1fr)'};
  gap: 1rem;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  
  &:last-child {
    border-bottom: none;
  }
`;

// Dashboard Skeleton - For dashboard pages
export const DashboardSkeleton = () => (
  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
    {/* Header Skeleton */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <SkeletonBox width="280px" height="32px" />
        <SkeletonBox width="420px" height="16px" />
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <SkeletonBox width="140px" height="16px" />
        <SkeletonBox width="100px" height="36px" style={{ borderRadius: '8px' }} />
      </div>
    </div>

    {/* Stats Cards Skeleton (4 blocks) */}
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
      gap: '1rem' 
    }}>
      {[1, 2, 3, 4].map((i) => (
        <SkeletonCard key={i} style={{ padding: '1rem', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <SkeletonCircle size="28px" />
            <SkeletonBox width="40px" height="24px" style={{ borderRadius: '6px' }} />
          </div>
          <SkeletonBox width="70%" height="16px" />
          <SkeletonBox width="50%" height="12px" />
        </SkeletonCard>
      ))}
    </div>

    {/* Campus & Stream Analytics Full Section Skeleton */}
    <SkeletonCard style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <SkeletonBox width="280px" height="24px" />
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {[1, 2, 3, 4, 5].map((k) => (
            <SkeletonBox key={k} width="70px" height="28px" style={{ borderRadius: '8px' }} />
          ))}
        </div>
      </div>
      <SkeletonBox width="100%" height="90px" style={{ borderRadius: '12px', marginTop: '0.5rem' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '0.5rem' }}>
        {[1, 2, 3, 4].map((j) => (
          <SkeletonBox key={j} width="100%" height="95px" style={{ borderRadius: '12px' }} />
        ))}
      </div>
    </SkeletonCard>

    {/* Content Charts Grid Skeleton (2 Side-by-Side Cards) */}
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
      gap: '1.25rem' 
    }}>
      <SkeletonCard style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <SkeletonBox width="200px" height="22px" />
          <SkeletonBox width="70px" height="22px" style={{ borderRadius: '12px' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', gap: '1rem' }}>
          <SkeletonCircle size="140px" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', flex: 1 }}>
            {[1, 2, 3, 4, 5].map((m) => (
              <SkeletonBox key={m} width="100%" height="16px" />
            ))}
          </div>
        </div>
      </SkeletonCard>

      <SkeletonCard style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <SkeletonBox width="200px" height="22px" />
          <SkeletonBox width="60px" height="22px" style={{ borderRadius: '12px' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <SkeletonBox width="100%" height="14px" />
              <SkeletonBox width="100%" height="8px" style={{ borderRadius: '4px' }} />
            </div>
          ))}
        </div>
      </SkeletonCard>
    </div>
  </div>
);

// Table Skeleton
export const TableSkeleton = ({ rows = 5, columns = 'repeat(5, 1fr)' }) => (
  <SkeletonTable>
    <TableHeader $columns={columns}>
      {columns.split(' ').map((_, i) => (
        <SkeletonBox key={i} height="20px" />
      ))}
    </TableHeader>
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <TableRow key={rowIndex} $columns={columns}>
        {columns.split(' ').map((_, colIndex) => (
          <SkeletonBox key={colIndex} height="16px" />
        ))}
      </TableRow>
    ))}
  </SkeletonTable>
);

// Card Grid Skeleton
export const CardGridSkeleton = ({ count = 3 }) => (
  <div style={{ 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
    gap: '1.5rem' 
  }}>
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i}>
        <SkeletonCircle size="48px" />
        <SkeletonBox width="80%" height="24px" />
        <SkeletonBox width="100%" height="16px" />
        <SkeletonBox width="60%" height="16px" />
      </SkeletonCard>
    ))}
  </div>
);

// Form Skeleton
export const FormSkeleton = () => (
  <div style={{ 
    background: 'white', 
    borderRadius: '12px', 
    padding: '2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
  }}>
    <SkeletonBox width="200px" height="32px" />
    {[1, 2, 3, 4].map((i) => (
      <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <SkeletonBox width="120px" height="16px" />
        <SkeletonBox width="100%" height="40px" />
      </div>
    ))}
    <SkeletonBox width="150px" height="40px" />
  </div>
);

// List Skeleton
export const ListSkeleton = ({ count = 5 }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
    {Array.from({ length: count }).map((_, i) => (
      <div 
        key={i} 
        style={{ 
          background: 'white', 
          borderRadius: '8px', 
          padding: '1rem',
          display: 'flex',
          gap: '1rem',
          alignItems: 'center'
        }}
      >
        <SkeletonCircle size="40px" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <SkeletonBox width="60%" height="18px" />
          <SkeletonBox width="40%" height="14px" />
        </div>
      </div>
    ))}
  </div>
);

// Test Card Skeleton - Specific for test cards
export const TestCardSkeleton = ({ count = 3 }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
    {Array.from({ length: count }).map((_, i) => (
      <div 
        key={i}
        style={{ 
          background: 'white', 
          borderRadius: '12px', 
          padding: '1.5rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <SkeletonBox width="200px" height="24px" />
          <SkeletonBox width="80px" height="24px" />
        </div>
        <SkeletonBox width="100%" height="16px" style={{ marginBottom: '0.5rem' }} />
        <SkeletonBox width="80%" height="16px" style={{ marginBottom: '1rem' }} />
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <SkeletonBox width="150px" height="16px" />
          <SkeletonBox width="150px" height="16px" />
        </div>
        <SkeletonBox width="120px" height="36px" />
      </div>
    ))}
  </div>
);

// Section Table Page Skeleton (For Candidate Application, Submissions, Candidates, Interviews, etc.)
export const TablePageSkeleton = ({ rows = 6, columns = 'repeat(6, 1fr)' }) => (
  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
    {/* Page Header Skeleton */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <SkeletonBox width="260px" height="30px" />
        <SkeletonBox width="420px" height="16px" />
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <SkeletonBox width="140px" height="36px" style={{ borderRadius: '8px' }} />
      </div>
    </div>

    {/* Section Card with Controls & Table */}
    <SkeletonCard style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid #e0f2fe', paddingBottom: '0.875rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {[1, 2, 3, 4].map((k) => (
            <SkeletonBox key={k} width="110px" height="32px" style={{ borderRadius: '8px' }} />
          ))}
        </div>
        <SkeletonBox width="220px" height="32px" style={{ borderRadius: '8px' }} />
      </div>
      <div style={{ marginTop: '0.5rem' }}>
        <TableSkeleton rows={rows} columns={columns} />
      </div>
    </SkeletonCard>
  </div>
);

// Main SkeletonLoader component - Can be used as a wrapper
const SkeletonLoader = ({ children, loading, variant = 'dashboard', ...props }) => {
  if (!loading) {
    return children;
  }

  switch (variant) {
    case 'dashboard':
      return <DashboardSkeleton />;
    case 'table-page':
      return <TablePageSkeleton {...props} />;
    case 'table':
      return <TableSkeleton {...props} />;
    case 'card-grid':
      return <CardGridSkeleton {...props} />;
    case 'form':
      return <FormSkeleton />;
    case 'list':
      return <ListSkeleton {...props} />;
    case 'test-card':
      return <TestCardSkeleton {...props} />;
    default:
      return <DashboardSkeleton />;
  }
};

export default SkeletonLoader;
