import React, { useState, createContext, useContext, useMemo } from 'react';

const SearchContext = createContext();

export const useSearch = () => useContext(SearchContext);

export const SearchProvider = ({ children }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL'); // ALL, LOST, FOUND
  const [myPostsOnly, setMyPostsOnly] = useState(false);
  const [sortBy, setSortBy] = useState('newest'); // newest, incident

  const clearFilters = () => {
    setSearchTerm('');
    setLocationFilter('');
    setStatusFilter('');
    setTypeFilter('ALL');
    setMyPostsOnly(false);
    setSortBy('newest');
  };

  const isActive = searchTerm !== '' || locationFilter !== '' || statusFilter !== '' || myPostsOnly;

  return (
    <SearchContext.Provider value={{
      searchTerm, setSearchTerm,
      locationFilter, setLocationFilter,
      statusFilter, setStatusFilter,
      typeFilter, setTypeFilter,
      myPostsOnly, setMyPostsOnly,
      sortBy, setSortBy,
      clearFilters, isActive
    }}>
      {children}
    </SearchContext.Provider>
  );
};

// Hook to filter and sort items based on current search/filter state.
// Used by both MapView and Feed.
export const useFilteredItems = (allItems, userEmail) => {
  const { searchTerm, locationFilter, statusFilter, typeFilter, myPostsOnly, sortBy } = useSearch();

  return useMemo(() => {
    let filtered = allItems.filter(item => {
      // Status filter
      if (statusFilter === '') {
        if (item.status === 'RESOLVED') return false;
      } else if (statusFilter === 'RESOLVED') {
        if (item.status !== 'RESOLVED') return false;
      }
      // statusFilter === 'ALL' shows everything

      // Type filter
      if (typeFilter === 'LOST' && item.postType !== 'LOST') return false;
      if (typeFilter === 'FOUND' && item.postType !== 'FOUND') return false;

      // Location filter
      if (locationFilter !== '' && item.location !== locationFilter) return false;

      // My posts filter
      if (myPostsOnly && userEmail && item.authorEmail !== userEmail) return false;

      // Search term
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        const titleMatch = (item.title || '').toLowerCase().includes(term);
        const tagsMatch = (item.tags || []).some(tag => tag.toLowerCase().includes(term));
        const descMatch = (item.description || '').toLowerCase().includes(term);
        if (!titleMatch && !tagsMatch && !descMatch) return false;
      }

      return true;
    });

    // Sort
    if (sortBy === 'incident') {
      filtered.sort((a, b) => {
        const dateA = a.incidentDate || '';
        const dateB = b.incidentDate || '';
        return dateB.localeCompare(dateA);
      });
    } else {
      // Default: newest first (by creation timestamp)
      filtered.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    }

    return filtered;
  }, [allItems, searchTerm, locationFilter, statusFilter, typeFilter, myPostsOnly, sortBy, userEmail]);
};
