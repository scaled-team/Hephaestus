"""
Test module to verify coding agent functionality.

This module contains a simple function to test basic coding operations
including file creation, function definition, and execution.
"""


def add_numbers(a: int, b: int) -> int:
    """
    Add two numbers together and return the result.

    Args:
        a: The first number to add
        b: The second number to add

    Returns:
        The sum of a and b

    Example:
        >>> add_numbers(5, 3)
        8
    """
    return a + b


def main() -> None:
    """Run a simple test of the add_numbers function."""
    # Test cases
    test_cases = [
        (5, 3, 8),
        (10, 20, 30),
        (-5, 5, 0),
        (0, 0, 0),
    ]

    print("Testing add_numbers function:")
    print("-" * 40)

    all_passed = True
    for a, b, expected in test_cases:
        result = add_numbers(a, b)
        status = "✓ PASS" if result == expected else "✗ FAIL"
        print(f"{status}: add_numbers({a}, {b}) = {result} (expected: {expected})")

        if result != expected:
            all_passed = False

    print("-" * 40)
    if all_passed:
        print("All tests passed!")
    else:
        print("Some tests failed!")


if __name__ == "__main__":
    main()
