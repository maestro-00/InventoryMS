import { useState } from "react";
import { Button } from "../../../shared/ui/button";
import { SelectField, TextField } from "../../../shared/ui/forms/form-field";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";
import { LoadingState } from "../../../shared/ui/states/ui-state";
import { useCategories, useCategoryMutations } from "./api/category-queries";
import {
  eligibleParents,
  flattenCategories,
  wouldCreateCycle,
  type FlatCategory,
} from "./category-tree";

const NO_PARENT = "";

function parentOptions(categories: FlatCategory[]) {
  return [
    { value: NO_PARENT, label: "No parent (top level)" },
    ...categories.map((category) => ({
      value: category.id,
      label: `${"— ".repeat(category.depth)}${category.name}`,
    })),
  ];
}

export function CategoryMaintenance() {
  const categoriesQuery = useCategories();
  const { create, rename, deactivate } = useCategoryMutations();

  const [newName, setNewName] = useState("");
  const [newParent, setNewParent] = useState(NO_PARENT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editParent, setEditParent] = useState(NO_PARENT);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [guardMessage, setGuardMessage] = useState<string | null>(null);

  if (categoriesQuery.isPending) {
    return <LoadingState label="Loading categories" />;
  }

  if (categoriesQuery.isError) {
    return <ProblemSummary problem={toProblem(categoriesQuery.error)} />;
  }

  const tree = categoriesQuery.data;
  const flat = flattenCategories(tree);
  const problem =
    toProblem(create.error) ?? toProblem(rename.error) ?? toProblem(deactivate.error);

  function startEdit(id: string, name: string, parentId: string | null) {
    setEditingId(id);
    setEditName(name);
    setEditParent(parentId ?? NO_PARENT);
    setGuardMessage(null);
  }

  function submitEdit() {
    if (!editingId) return;
    const parentId = editParent === NO_PARENT ? null : editParent;
    if (wouldCreateCycle(tree, editingId, parentId)) {
      setGuardMessage(
        "A category cannot be moved under itself or one of its own subcategories.",
      );
      return;
    }
    rename.mutate(
      { id: editingId, input: { name: editName, parentId } },
      {
        onSuccess: () => {
          setEditingId(null);
        },
      },
    );
  }

  return (
    <section className="flex flex-col gap-6" aria-labelledby="categories-heading">
      <h1 id="categories-heading" className="text-2xl font-semibold">
        Product categories
      </h1>

      {problem ? <ProblemSummary problem={problem} /> : null}
      {guardMessage ? (
        <ProblemSummary messages={[guardMessage]} title="Move blocked" />
      ) : null}

      {flat.length === 0 ? (
        <div className="flex flex-col items-start gap-3" data-state="empty">
          <p>
            No categories yet. Categories group products for stock filters and reports.
          </p>
          <Button
            type="button"
            onClick={() => {
              setNewName("General");
            }}
          >
            Create your first category
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {flat.map((category) => (
            <li
              key={category.id}
              aria-label={category.name}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
              style={{ marginInlineStart: `${String(category.depth * 16)}px` }}
            >
              <span>{category.name}</span>
              <span className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    startEdit(category.id, category.name, category.parentId);
                  }}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setConfirmingId(category.id);
                  }}
                >
                  Deactivate
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {confirmingId ? (
        <div
          role="group"
          aria-label="Confirm deactivation"
          className="flex flex-col gap-2 rounded-md border p-3"
        >
          <p>
            Deactivating removes the category from selection lists. Products keep their
            history and can be recategorised.
          </p>
          <span className="flex gap-2">
            <Button
              type="button"
              variant="destructive"
              disabled={deactivate.isPending}
              onClick={() => {
                deactivate.mutate(confirmingId, {
                  onSuccess: () => {
                    setConfirmingId(null);
                  },
                });
              }}
            >
              Yes, deactivate
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setConfirmingId(null);
              }}
            >
              Keep category
            </Button>
          </span>
        </div>
      ) : null}

      {editingId ? (
        <form
          className="flex flex-col gap-3 rounded-md border p-3"
          onSubmit={(event) => {
            event.preventDefault();
            submitEdit();
          }}
        >
          <h2 className="font-semibold">Edit category</h2>
          <TextField
            label="Category name"
            required
            value={editName}
            onChange={(event) => {
              setEditName(event.target.value);
            }}
          />
          <SelectField
            label="Move under"
            options={parentOptions(eligibleParents(tree, editingId))}
            value={editParent}
            onChange={(event) => {
              setEditParent(event.target.value);
            }}
          />
          <span className="flex gap-2">
            <Button type="submit" disabled={rename.isPending}>
              Save category
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditingId(null);
              }}
            >
              Cancel
            </Button>
          </span>
        </form>
      ) : null}

      <form
        className="flex flex-col gap-3 rounded-md border p-3"
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate(
            {
              name: newName,
              parentId: newParent === NO_PARENT ? null : newParent,
            },
            {
              onSuccess: () => {
                setNewName("");
                setNewParent(NO_PARENT);
              },
            },
          );
        }}
      >
        <h2 className="font-semibold">Add a category</h2>
        <TextField
          label="New category name"
          required
          value={newName}
          onChange={(event) => {
            setNewName(event.target.value);
          }}
        />
        <SelectField
          label="Parent category"
          options={parentOptions(flat)}
          value={newParent}
          onChange={(event) => {
            setNewParent(event.target.value);
          }}
        />
        <Button type="submit" disabled={create.isPending || newName.trim().length < 2}>
          Add category
        </Button>
      </form>
    </section>
  );
}
