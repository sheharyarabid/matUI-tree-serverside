import { Component, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs'; // Import BehaviorSubject for managing state
import { HttpClient } from '@angular/common/http'; // Import HttpClient for making HTTP requests
import { FlatTreeControl } from '@angular/cdk/tree'; // Import FlatTreeControl for managing the tree structure
import { MatTreeFlattener, MatTreeFlatDataSource, MatTreeModule } from '@angular/material/tree'; // Import Angular Material tree modules
import { MatButtonModule } from '@angular/material/button'; // Import Angular Material button module
import { MatCheckboxModule } from '@angular/material/checkbox'; // Import Angular Material checkbox module
import { MatIconModule } from '@angular/material/icon'; // Import Angular Material icon module
import { MatFormFieldModule } from '@angular/material/form-field'; // Import Angular Material form field module
import { MatInputModule } from '@angular/material/input'; // Import Angular Material input module
import { CdkTreeModule } from '@angular/cdk/tree'; // Import CDK tree module
import { ReactiveFormsModule } from '@angular/forms'; // Import ReactiveFormsModule for handling forms
import { SelectionModel } from '@angular/cdk/collections'; // Import SelectionModel for managing selected nodes
import { HttpClientModule } from '@angular/common/http'; // Import HttpClientModule for HTTP requests

/**
 * Node for to-do item
 */
export class TodoItemNode {
  children: TodoItemNode[]; // List of child nodes
  item: string; // Item name
}

export class TodoItemFlatNode {
  item: string; // Item name
  level: number; // Level in the tree
  expandable: boolean; // Whether the node can be expanded
}

/**
 * Service for managing checklist data
 */
@Injectable()
export class ChecklistDatabase {
  private apiUrl = 'http://localhost:1337/api/nodes?populate=*'; // API URL to fetch node data
  dataChange = new BehaviorSubject<TodoItemNode[]>([]); // BehaviorSubject to manage data state

  constructor(private http: HttpClient) {
    this.initialize(); // Initialize data fetching
  }

  // Getter for data
  get data(): TodoItemNode[] {
    return this.dataChange.value;
  }

  // Initialize data by fetching from API
  initialize() {
    this.http.get<any>(this.apiUrl).subscribe(
      (response: any) => {
        if (response && response.data) {
          try {
            const data = this.buildFileTree(response.data, 0); // Build tree structure
            this.dataChange.next(data); // Update data state
          } catch (error) {
            console.error('Error processing data:', error); // Handle data processing errors
            this.dataChange.next([]); // Set empty data on error
          }
        } else {
          console.error('Unexpected response structure:', response); // Handle unexpected response structure
          this.dataChange.next([]); // Set empty data on error
        }
      },
      error => {
        console.error('Error fetching data:', error); // Handle HTTP request errors
        this.dataChange.next([]); // Set empty data on error
      }
    );
  }

  // Build tree structure from nodes
  buildFileTree(nodes: any[], level: number): TodoItemNode[] {
    const nodeMap: { [key: number]: TodoItemNode } = {}; // Map to store nodes by ID
    const rootNodes: TodoItemNode[] = []; // List to store root nodes

    // First pass: Create all nodes and map by ID
    nodes.forEach(node => {
      const itemNode = new TodoItemNode();
      itemNode.item = node.attributes?.name || 'Unnamed Node'; // Default value if name is not available
      itemNode.children = [];
      nodeMap[node.id] = itemNode;
    });

    // Second pass: Establish parent-child relationships
    nodes.forEach(node => {
      const itemNode = nodeMap[node.id];
      const children = node.attributes?.children?.data || [];
      
      // Assign children nodes
      children.forEach((child: any) => {
        if (nodeMap[child.id]) {
          itemNode.children.push(nodeMap[child.id]); // Add child to the parent node
        }
      });

      // Root node(s) have no parent
      if (!node.attributes?.parent?.data) {
        rootNodes.push(itemNode); // Add to root nodes
      }
    });

    return rootNodes; // Return constructed tree
  }
}

/**
 * @title Tree with checkboxes
 */
@Component({
  selector: 'app-tree', // Component selector
  templateUrl: 'tree.component.html', // Component template URL
  styleUrls: ['tree.component.scss'], // Component styles URL
  providers: [ChecklistDatabase], // Provide the ChecklistDatabase service
  standalone: true, // Standalone component
  imports: [MatCheckboxModule, HttpClientModule, MatButtonModule, MatTreeModule, MatIconModule, MatFormFieldModule, MatInputModule, CdkTreeModule, ReactiveFormsModule], // Import necessary modules
})
export class TreeComponent {
  flatNodeMap = new Map<TodoItemFlatNode, TodoItemNode>(); // Map to associate flat nodes with tree nodes
  nestedNodeMap = new Map<TodoItemNode, TodoItemFlatNode>(); // Map to associate tree nodes with flat nodes
  selectedParent: TodoItemFlatNode | null = null; // Selected parent node
  newItemName = ''; // New item name
  treeControl: FlatTreeControl<TodoItemFlatNode>; // FlatTreeControl for managing tree structure
  treeFlattener: MatTreeFlattener<TodoItemNode, TodoItemFlatNode>; // MatTreeFlattener to flatten nodes
  dataSource: MatTreeFlatDataSource<TodoItemNode, TodoItemFlatNode>; // Data source for the tree
  checklistSelection = new SelectionModel<TodoItemFlatNode>(true /* multiple */); // Selection model for managing selected nodes

  constructor(private _database: ChecklistDatabase) {
    this.treeFlattener = new MatTreeFlattener(
      this.transformer, // Function to convert tree node to flat node
      this.getLevel, // Function to get the level of a flat node
      this.isExpandable, // Function to check if a flat node is expandable
      this.getChildren, // Function to get children of a tree node
    );
    this.treeControl = new FlatTreeControl<TodoItemFlatNode>(this.getLevel, this.isExpandable); // Initialize tree control
    this.dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener); // Initialize data source

    this._database.dataChange.subscribe(data => {
      this.dataSource.data = data; // Update data source when data changes
    });
  }

  // Function to get the level of a flat node
  getLevel = (node: TodoItemFlatNode) => node.level;
  // Function to check if a flat node is expandable
  isExpandable = (node: TodoItemFlatNode) => node.expandable;
  // Function to get children of a tree node
  getChildren = (node: TodoItemNode): TodoItemNode[] => node.children;
  // Function to check if a flat node has children
  hasChild = (_: number, _nodeData: TodoItemFlatNode) => _nodeData.expandable;
  // Function to check if a flat node has no content
  hasNoContent = (_: number, _nodeData: TodoItemFlatNode) => _nodeData.item === '';

  // Transformer function to convert tree node to flat node
  transformer = (node: TodoItemNode, level: number) => {
    const existingNode = this.nestedNodeMap.get(node);
    const flatNode =
      existingNode && existingNode.item === node.item ? existingNode : new TodoItemFlatNode();
    flatNode.item = node.item;
    flatNode.level = level;
    flatNode.expandable = !!node.children?.length;
    this.flatNodeMap.set(flatNode, node);
    this.nestedNodeMap.set(node, flatNode);
    return flatNode;
  };

  // Function to get the parent node of a flat node
  getParentNode(node: TodoItemFlatNode): TodoItemFlatNode | null {
    const currentLevel = this.getLevel(node);
    if (currentLevel < 1) {
      return null; // No parent if at root level
    }

    const startIndex = this.treeControl.dataNodes.indexOf(node) - 1;

    for (let i = startIndex; i >= 0; i--) {
      const currentNode = this.treeControl.dataNodes[i];
      if (this.getLevel(currentNode) < currentLevel) {
        return currentNode; // Return the parent node
      }
    }
    return null; // No parent found
  }


  addNewItem(node: TodoItemFlatNode) {
    // This method is not used  yet
  }


  saveNode(node: TodoItemFlatNode, itemValue: string) {
    // This method is not used yet
  }
}