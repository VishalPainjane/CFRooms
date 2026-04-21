# Contributing to CFRooms

First off, thank you for considering contributing to CFRooms! It's people like you that make CFRooms such a great tool for the competitive programming community.

## 1. Where do I go from here?

If you've noticed a bug or have a feature request, please make sure to check our [Issue Tracker](https://github.com/VishalPainjane/CFRooms/issues) to see if someone else has already created a ticket. If not, go ahead and make one!

## 2. Fork & create a branch

If this is something you think you can fix, then [fork CFRooms](https://github.com/VishalPainjane/CFRooms/fork) and create a branch with a descriptive name.

```bash
git checkout -b feature/my-new-feature
```

## 3. Implement your fix or feature

Ensure you have followed the [Setup Guide](docs/SETUP.md) to get your local environment running. 
- Try to keep your code close to the existing style.
- Document any new features in the README or Docs.

## 4. Make a Pull Request

At this point, you should switch back to your master branch and make sure it's up to date with CFRooms' master branch:

```bash
git remote add upstream git@github.com:VishalPainjane/CFRooms.git
git checkout main
git pull upstream main
```

Then update your feature branch from your local copy of main, and push it!

```bash
git checkout feature/my-new-feature
git rebase main
git push --set-upstream origin feature/my-new-feature
```

Finally, go to GitHub and make a Pull Request. Thank you!