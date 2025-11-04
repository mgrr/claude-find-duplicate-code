#!/bin/bash

# Refactoring Tools Wrapper Script
# Makes it easy to run code duplication analysis

set -e

echo ""
echo "🔧 Code Refactoring Tools"
echo "=========================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

show_menu() {
    echo "Choose an option:"
    echo ""
    echo "  1) Find duplicate code"
    echo "  2) Generate refactoring suggestions"
    echo "  3) Create utility file templates"
    echo "  4) Run full analysis (1 + 2)"
    echo "  5) View existing report"
    echo "  6) Clean reports"
    echo "  7) Exit"
    echo ""
}

find_duplicates() {
    echo -e "${BLUE}🔍 Analyzing codebase for duplicates...${NC}"
    echo ""
    node --max-old-space-size=4096 find-duplicate-code.cjs
    echo ""
    echo -e "${GREEN}✅ Analysis complete!${NC}"
}

generate_suggestions() {
    if [ ! -f "duplication-report.json" ]; then
        echo -e "${YELLOW}⚠️  No report found. Running analysis first...${NC}"
        echo ""
        find_duplicates
    fi

    echo ""
    echo -e "${BLUE}💡 Generating refactoring suggestions...${NC}"
    echo ""
    node refactor-helper.cjs
}

create_templates() {
    if [ ! -f "duplication-report.json" ]; then
        echo -e "${YELLOW}⚠️  No report found. Running analysis first...${NC}"
        echo ""
        find_duplicates
    fi

    echo ""
    echo -e "${BLUE}🏗️  Creating utility file templates...${NC}"
    echo ""
    node refactor-helper.cjs --create
    echo ""
    echo -e "${GREEN}✅ Templates created in src/lib/utils/${NC}"
}

full_analysis() {
    find_duplicates
    generate_suggestions
}

view_report() {
    if [ ! -f "duplication-report.json" ]; then
        echo -e "${YELLOW}⚠️  No report found. Run analysis first (option 1).${NC}"
        return
    fi

    echo -e "${BLUE}📊 Report Summary:${NC}"
    echo ""

    # Extract summary using jq if available, otherwise use grep
    if command -v jq &> /dev/null; then
        echo "Total patterns: $(jq '.summary.totalPatterns' duplication-report.json)"
        echo "Total duplicated lines: $(jq '.summary.totalLines' duplication-report.json)"
        echo "Average duplication: $(jq '.summary.avgDuplication' duplication-report.json) lines"
    else
        echo "Install 'jq' for better report viewing"
        echo "Or open duplication-report.json manually"
    fi

    echo ""
    echo "Full report: duplication-report.json"
}

clean_reports() {
    echo -e "${YELLOW}🗑️  Cleaning reports...${NC}"
    rm -f duplication-report.json
    echo -e "${GREEN}✅ Reports cleaned${NC}"
}

# Check if running with argument
if [ $# -eq 1 ]; then
    case $1 in
        1|find|analyze)
            find_duplicates
            exit 0
            ;;
        2|suggest|suggestions)
            generate_suggestions
            exit 0
            ;;
        3|create|templates)
            create_templates
            exit 0
            ;;
        4|full|all)
            full_analysis
            exit 0
            ;;
        5|view|report)
            view_report
            exit 0
            ;;
        6|clean)
            clean_reports
            exit 0
            ;;
        *)
            echo "Invalid option: $1"
            exit 1
            ;;
    esac
fi

# Interactive menu
while true; do
    show_menu
    read -p "Enter your choice [1-7]: " choice
    echo ""

    case $choice in
        1)
            find_duplicates
            echo ""
            ;;
        2)
            generate_suggestions
            echo ""
            ;;
        3)
            create_templates
            echo ""
            ;;
        4)
            full_analysis
            echo ""
            ;;
        5)
            view_report
            echo ""
            ;;
        6)
            clean_reports
            echo ""
            ;;
        7)
            echo "👋 Goodbye!"
            exit 0
            ;;
        *)
            echo -e "${YELLOW}Invalid choice. Please select 1-7.${NC}"
            echo ""
            ;;
    esac
done
