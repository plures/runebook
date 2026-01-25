---
name: Release Checklist
about: Checklist for creating a new release
title: 'Release vX.Y.Z'
labels: release
assignees: ''
---

## Pre-Release Checklist

- [ ] All features/fixes for this release are merged to main
- [ ] CHANGELOG.md is updated with version details
- [ ] All tests pass locally
- [ ] Documentation is up to date
- [ ] Version type decided (patch/minor/major)

## Release Process

- [ ] Run Version Bump workflow with correct version type
- [ ] Review and edit draft release notes
- [ ] Publish GitHub Release
- [ ] Verify build artifacts are uploaded
- [ ] Verify npm package is published
- [ ] Verify GitHub Packages is updated
- [ ] Verify winget submission (if applicable)

## Post-Release

- [ ] Test installation from npm: `npm install @plures/runebook`
- [ ] Test GitHub Release downloads
- [ ] Update documentation if needed
- [ ] Announce release (if applicable)

## Version Information

**Current Version**: 0.3.0
**Target Version**: X.Y.Z
**Release Type**: patch | minor | major

## Notes

<!-- Add any additional notes or context for this release -->
