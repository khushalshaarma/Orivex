"use client"
import { useState, useCallback, useEffect, useRef, useMemo } from "react"
import { Search, X, Filter, Calendar, Users, Hash, MessageSquare, FileText, Pin, Clock, ArrowUpRight, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"

interface SearchResult {
  id: string
  type: "message" | "channel" | "user" | "thread" | "attachment"
  title: string
  snippet: string
  url: string
  metadata: {
    workspace?: string
    channel?: string
    conversation?: string
    author?: {
      name: string
      avatar?: string
    }
    timestamp?: Date
    highlighted?: boolean
    reaction?: string
    attachments?: number
  }
}

interface GlobalSearchState {
  query: string
  isOpen: boolean
  results: SearchResult[]
  isLoading: boolean
  recentSearches: string[]
  hasMore: boolean
  page: number
  filters: SearchFilters
}

interface SearchFilters {
  types: {
    messages: boolean
    channels: boolean
    users: boolean
    threads: boolean
    attachments: boolean
  }
  workspace?: string
  channel?: string
  dateRange?: {
    from?: Date
    to?: Date
  }
  author?: string
  hasAttachments: boolean
  hasMentions: boolean
  isPinned: boolean
}

interface GlobalSearchProps {
  onResultClick?: (result: SearchResult) => void
  className?: string
  placeholder?: string
  buttonText?: string
}

interface UseGlobalSearchReturn {
  state: GlobalSearchState
  actions: {
    setQuery: (query: string) => void
    setIsOpen: (open: boolean) => void
    clearSearch: () => void
    addRecentSearch: (query: string) => void
    removeRecentSearch: (query: string) => void
    clearRecentSearches: () => void
    setPage: (page: number) => void
    setFilters: (filters: Partial<SearchFilters>) => void
    resetFilters: () => void
  }
  results: {
    filteredResults: SearchResult[]
    searchStats: SearchStats
    isEmpty: boolean
    hasResults: boolean
  }
}

interface SearchStats {
  totalResults: number
  resultCounts: {
    messages: number
    channels: number
    users: number
    threads: number
    attachments: number
  }
  searchTime: number
}

const DEFAULT_FILTERS: SearchFilters = {
  types: {
    messages: true,
    channels: true,
    users: true,
    threads: true,
    attachments: false,
  },
  hasAttachments: false,
  hasMentions: false,
  isPinned: false,
}

export function useGlobalSearch(options?: {
  debounceMs?: number
  initialPageSize?: number
  enableRecentSearches?: boolean
  endpoint?: string
}): UseGlobalSearchReturn {
  const [state, setState] = useState<GlobalSearchState>({
    query: "",
    isOpen: false,
    results: [],
    isLoading: false,
    recentSearches: [],
    hasMore: false,
    page: 1,
    filters: DEFAULT_FILTERS,
  })

  const { debounceMs = 300, initialPageSize = 10 } = options || {}
  const previousQueryRef = useRef<string>("")
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const performSearch = useCallback(
    async (query: string, page: number = 1, filters: SearchFilters) => {
      if (!query.trim()) {
        setState((prev) => ({ ...prev, results: [], hasMore: false }))
        return
      }

      setState((prev) => ({ ...prev, isLoading: true }))

      try {
        const searchParams = new URLSearchParams()
        searchParams.set("q", query)
        searchParams.set("page", page.toString())
        searchParams.set("pageSize", initialPageSize.toString())

        if (filters.types.messages) searchParams.set("type", "messages")
        if (filters.types.channels) {
          const channelType = searchParams.get("type") ? `${searchParams.get("type")},channels` : "channels"
          searchParams.set("type", channelType)
        }
        if (filters.types.users) {
          const type = searchParams.get("type") ? `${searchParams.get("type")},users` : "users"
          searchParams.set("type", type)
        }
        if (filters.types.threads) {
          const type = searchParams.get("type") ? `${searchParams.get("type")},threads` : "threads"
          searchParams.set("type", type)
        }
        if (filters.types.attachments) {
          const type = searchParams.get("type") ? `${searchParams.get("type")},attachments` : "attachments"
          searchParams.set("type", type)
        }

        if (filters.channel) searchParams.set("channel", filters.channel)
        if (filters.workspace) searchParams.set("workspace", filters.workspace)
        if (filters.hasAttachments) searchParams.set("hasAttachments", "true")
        if (filters.hasMentions) searchParams.set("hasMentions", "true")
        if (filters.isPinned) searchParams.set("isPinned", "true")

        const response = await fetch(`/api/search/global?${searchParams.toString()}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          throw new Error("Search failed")
        }

        const data = await response.json()

        const newResults = data.results || []
        const isLastPage = newResults.length < initialPageSize

        setState((prev) => ({
          ...prev,
          results: page === 1 ? newResults : [...prev.results, ...newResults],
          isLoading: false,
          hasMore: !isLastPage,
        }))
      } catch (error) {
        console.error("Search error:", error)
        setState((prev) => ({ ...prev, isLoading: false }))
      }
    },
    [initialPageSize]
  )

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (state.query !== previousQueryRef.current) {
        setState((prev) => ({ ...prev, page: 1 }))
        previousQueryRef.current = state.query
        performSearch(state.query, 1, state.filters)
      }
    }, debounceMs)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [state.query, performSearch, debounceMs])

  useEffect(() => {
    if (state.query) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      performSearch(state.query, state.page, state.filters)
    }
  }, [state.page, state.filters])

  const setQuery = useCallback((query: string) => {
    setState((prev) => ({ ...prev, query }))
  }, [])

  const setIsOpen = useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, isOpen: open }))
  }, [])

  const clearSearch = useCallback(() => {
    setState((prev) => ({
      ...prev,
      query: "",
      results: [],
      page: 1,
    }))
  }, [])

  const addRecentSearch = useCallback((query: string) => {
    if (query.trim()) {
      setState((prev) => {
        const filtered = prev.recentSearches.filter((q) => q !== query)
        return {
          ...prev,
          recentSearches: [query, ...filtered].slice(0, 10),
        }
      })
    }
  }, [])

  const removeRecentSearch = useCallback((query: string) => {
    setState((prev) => ({
      ...prev,
      recentSearches: prev.recentSearches.filter((q) => q !== query),
    }))
  }, [])

  const clearRecentSearches = useCallback(() => {
    setState((prev) => ({ ...prev, recentSearches: [] }))
  }, [])

  const setPage = useCallback((page: number) => {
    setState((prev) => ({ ...prev, page }))
  }, [])

  const setFilters = useCallback((partial: Partial<SearchFilters>) => {
    setState((prev) => ({
      ...prev,
      filters: { ...prev.filters, ...partial },
      page: 1,
    }))
  }, [])

  const resetFilters = useCallback(() => {
    setState((prev) => ({ ...prev, filters: DEFAULT_FILTERS, page: 1 }))
  }, [])

  const actions = {
    setQuery,
    setIsOpen,
    clearSearch,
    addRecentSearch,
    removeRecentSearch,
    clearRecentSearches,
    setPage,
    setFilters,
    resetFilters,
  }

  const filteredResults = useMemo(() => {
    return state.results
  }, [state.results])

  const searchStats: SearchStats = useMemo(() => {
    const resultCounts = {
      messages: 0,
      channels: 0,
      users: 0,
      threads: 0,
      attachments: 0,
    }

    state.results.forEach((result) => {
      if (result.type in resultCounts) {
        resultCounts[result.type as keyof typeof resultCounts]++
      }
    })

    return {
      totalResults: state.results.length,
      resultCounts,
      searchTime: 0,
    }
  }, [state.results])

  const isEmpty = Boolean(state.results.length === 0 && !state.isLoading && state.query)

  const hasResults = state.results.length > 0

  return {
    state,
    actions,
    results: {
      filteredResults,
      searchStats,
      isEmpty,
      hasResults,
    },
  }
}

export function GlobalSearch({
  onResultClick,
  className,
  placeholder = "Search messages, channels, users, files...",
  buttonText = "Search",
}: GlobalSearchProps) {
  const { state, actions, results } = useGlobalSearch({
    debounceMs: 300,
    initialPageSize: 15,
    enableRecentSearches: true,
  })

  const [isFocused, setIsFocused] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const formatTimeAgo = (date: Date): string => {
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return "now"
    if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60)
      return `${minutes} ${minutes === 1 ? "min" : "mins"} ago`
    }
    if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600)
      return `${hours} ${hours === 1 ? "hour" : "hours"} ago`
    }
    if (diffInSeconds < 2592000) {
      const days = Math.floor(diffInSeconds / 86400)
      return `${days} ${days === 1 ? "day" : "days"} ago`
    }
    if (diffInSeconds < 31536000) {
      const months = Math.floor(diffInSeconds / 2592000)
      return `${months} ${months === 1 ? "month" : "months"} ago`
    }
    const years = Math.floor(diffInSeconds / 31536000)
    return `${years} ${years === 1 ? "year" : "years"} ago`
  }

  const getResultIcon = (type: SearchResult["type"]) => {
    switch (type) {
      case "message":
        return <MessageSquare className="h-4 w-4 text-blue-600" />
      case "channel":
        return <Hash className="h-4 w-4 text-green-600" />
      case "user":
        return <Users className="h-4 w-4 text-purple-600" />
      case "thread":
        return <MessageSquare className="h-4 w-4 text-orange-600" />
      case "attachment":
        return <FileText className="h-4 w-4 text-red-600" />
      default:
        return <Search className="h-4 w-4 text-gray-600" />
    }
  }

  const getResultBadge = (type: SearchResult["type"]) => {
    const variants = {
      message: "bg-blue-100 text-blue-700",
      channel: "bg-green-100 text-green-700",
      user: "bg-purple-100 text-purple-700",
      thread: "bg-orange-100 text-orange-700",
      attachment: "bg-red-100 text-red-700",
    }

    return variants[type] || variants.message
  }

  const highlightText = (text: string, query: string): string => {
    if (!query) return text
    const regex = new RegExp(`(${query})`, "gi")
    return text.replace(regex, "<mark>$1</mark>")
  }

  return (
    <div className={cn("relative w-full", className)}>
      <div className="relative">
        <div
          role="button"
          tabIndex={0}
          className={cn(
            "flex items-center w-full h-10 pl-10 pr-4 cursor-pointer rounded-md border transition-all duration-200",
            isFocused ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-300",
          )}
          onClick={() => actions.setIsOpen(true)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); actions.setIsOpen(true) } }}
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <span className={cn("flex-1 truncate", !state.query && "text-gray-500")}>
            {state.query || placeholder}
          </span>
          {state.query && (
            <button
              type="button"
              className="flex items-center justify-center h-6 w-6 p-0 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 -mr-6"
              onClick={(e) => {
                e.stopPropagation()
                actions.clearSearch()
                searchInputRef.current?.focus()
              }}
            >
              <X className="h-3 w-3" />
            </button>
          )}
          <ChevronDown className="ml-1 h-4 w-4 text-gray-400" />
        </div>
      </div>

      {state.isOpen && (
        <div className="absolute top-full mt-2 w-full z-50 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Global Search</h3>
              {results.searchStats.totalResults > 0 && (
                <Badge variant="secondary">
{results.searchStats.totalResults} results
                </Badge>
              )}
            </div>

            <div className="relative">
              <Input
                ref={searchInputRef}
                value={state.query}
                onChange={(e) => actions.setQuery(e.target.value)}
                placeholder={placeholder}
                className="pl-10 pr-10"
                autoFocus
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              {state.query && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-100"
                  onClick={() => actions.clearSearch()}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="flex items-center justify-between mt-3 text-sm text-gray-600">
              {state.isLoading ? (
                <span>Loading...</span>
              ) : results.isEmpty ? (
                <span>No results found</span>
              ) : (
                <span>
                  Showing {Math.min(state.results.length, 50)} of {results.searchStats.totalResults} results
                </span>
              )}
            </div>
          </div>

          {state.isLoading && (
            <div className="p-8 text-center">
              <div className="inline-flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                <span className="text-gray-600">Searching...</span>
              </div>
            </div>
          )}

          {!state.isLoading && results.hasResults && (
            <div className="max-h-96 overflow-y-auto">
              <div className="p-2">
                {results.filteredResults.map((result) => (
                  <button
                    key={result.id}
                    className={cn(
                      "w-full text-left p-3 rounded-lg transition-colors",
                      "hover:bg-gray-50",
                      result.metadata.highlighted && "bg-blue-50 border-l-4 border-blue-500",
                    )}
                    onClick={() => {
                      onResultClick?.(result)
                      actions.addRecentSearch(state.query)
                      actions.setIsOpen(false)
                    }}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {getResultIcon(result.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4
                            className="font-medium text-gray-900 truncate"
                            dangerouslySetInnerHTML={{ __html: highlightText(result.title, state.query) }}
                          />
                          <Badge className={cn("ml-2 text-xs", getResultBadge(result.type))}>{
                            result.type
                          }</Badge>
                        </div>
                        <p
                          className="text-sm text-gray-600 line-clamp-2"
                          dangerouslySetInnerHTML={{ __html: highlightText(result.snippet, state.query) }}
                        />
                        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                          <div className="flex items-center space-x-3">
                            {result.metadata.author && (
                              <span className="flex items-center space-x-1">
                                <img
                                  src={result.metadata.author.avatar || "/placeholder.svg"}
                                  alt={result.metadata.author.name}
                                  className="w-4 h-4 rounded-full"
                                />
                                <span>{result.metadata.author.name}</span>
                              </span>
                            )}
                            {result.metadata.timestamp && (
                              <span className="flex items-center space-x-1">
                                <Clock className="h-3 w-3" />
                                <span>{formatTimeAgo(result.metadata.timestamp)}</span>
                              </span>
                            )}
                            {result.metadata.channel && (
                              <span className="flex items-center space-x-1">
                                <Hash className="h-3 w-3" />
                                <span>{result.metadata.channel}</span>
                              </span>
                            )}
                            {result.metadata.reaction && (
                              <span className="flex items-center space-x-1">
                                <span>{result.metadata.reaction}</span>
                              </span>
                            )}
                            {result.metadata.attachments && result.metadata.attachments > 0 && (
                              <span className="flex items-center space-x-1">
                                <FileText className="h-3 w-3" />
                                <span>{result.metadata.attachments}</span>
                              </span>
                            )}
                          </div>
                          <ArrowUpRight className="h-3 w-3 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  </button>
                ))}

                {state.hasMore && (
                  <div className="p-3 text-center border-t border-gray-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => actions.setPage(state.page + 1)}
                      disabled={state.isLoading}
                    >
                      Load more results
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {!state.isLoading && !results.hasResults && state.query && (
            <div className="p-8 text-center">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
              <p className="text-gray-600 mb-4">
                Try adjusting your search terms or filters
              </p>
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                <Filter className="h-4 w-4" />
                <span>Try searching for different keywords</span>
              </div>
            </div>
          )}

          {state.recentSearches.length > 0 && !state.query && !state.isLoading && (
            <div className="p-4 border-t border-gray-100">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Searches</h4>
              <div className="space-y-2">
                {state.recentSearches.map((search) => (
                  <div
                    key={search}
                    role="button"
                    tabIndex={0}
                    className="flex items-center w-full p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => {
                      actions.setQuery(search)
                      searchInputRef.current?.focus()
                    }}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); actions.setQuery(search); searchInputRef.current?.focus() } }}
                  >
                    <div className="flex items-center space-x-2 flex-1">
                      <Clock className="h-3 w-3 text-gray-400" />
                      <span className="text-sm text-gray-600 truncate">{search}</span>
                      <button
                        type="button"
                        className="ml-auto h-6 w-6 p-0 flex items-center justify-center rounded text-gray-400 hover:text-red-600 hover:bg-gray-100"
                        onClick={(e) => {
                          e.stopPropagation()
                          actions.removeRecentSearch(search)
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-left justify-start text-gray-500"
                  onClick={actions.clearRecentSearches}
                >
                  Clear recent searches
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {state.isOpen && (
        <div className="fixed inset-0 z-40 bg-black/20" onClick={() => actions.setIsOpen(false)} />
      )}
    </div>
  )
}
