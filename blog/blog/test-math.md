# Mathematical Foundations

This post demonstrates various mathematical concepts and equations.

## The Quadratic Formula

The solutions to a quadratic equation ax² + bx + c = 0 are given by:

```math
x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
```

## Maxwell's Equations

The differential form of Maxwell's equations:

```math
\begin{aligned}
\nabla \cdot \mathbf{E} &= \frac{\rho}{\varepsilon_0} \\
\nabla \cdot \mathbf{B} &= 0 \\
\nabla \times \mathbf{E} &= -\frac{\partial \mathbf{B}}{\partial t} \\
\nabla \times \mathbf{B} &= \mu_0\left(\mathbf{J} + \varepsilon_0\frac{\partial \mathbf{E}}{\partial t}\right)
\end{aligned}
```

## Probability Theory

The probability density function of a normal distribution:

```math
f(x) = \frac{1}{\sigma\sqrt{2\pi}}e^{-\frac{(x-\mu)^2}{2\sigma^2}}
```

## Linear Algebra

For a matrix equation Ax = b, the solution is:

```math
x = A^{-1}b = \frac{\text{adj}(A)}{\det(A)}b
```

## Category Theory

The definition of a natural transformation η between functors F and G:

```math
\eta: F \Rightarrow G
```

For each object X in category C, we have a morphism:

```math
\eta_X: F(X) \to G(X)
``` 