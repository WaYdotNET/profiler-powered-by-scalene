# Changelog

All notable changes to the "Profiler Powered by Scalene" extension will be documented in this file.

## [0.1.0] - 2024-12-29

### Added

- **Profile Python files** - Full, memory-only, or selected code profiling
- **📖 About tab** - Comprehensive metrics guide, color reference, optimization tips, and links
- **🔗 Footer** - Links to Scalene, extension repo, Rosé Pine theme, and attributions
- **Profile viewer redesign** - Source code inline, statistics dashboard, progress bars, function profiles, leak detection
- **Parser module** - Transforms raw JSON, calculates statistics, leak scoring algorithm
- **Enhanced types** - Complete type coverage for raw and normalized Scalene data
- **Auto-detect Python** - Interpreter detection and Scalene installation (uv or pip)
- **Status bar integration** - Quick access from status bar
- **Context menu commands** - Right-click profiling options
- **Django profiling docs** - 5 methods with code examples

### Fixed

- **Scalene JSON parsing** - Correctly parses `elapsed_time_sec`, `lines` array, `functions` array, and inline source code

### Improved

- **All metrics displayed** - CPU (Python/Native), Memory (Peak/Alloc/Growth), Copy (MB/s), GPU when available
- **Better leak detection** - Multi-factor scoring (growth, patterns, usage), configurable threshold, visual warnings
- **Rosé Pine Dawn theme** - WCAG AAA compliant, distinct colors for metrics, responsive layout, large progress bars
- **Configuration** - Sampling rate, output directory, auto-open viewer, leak threshold
